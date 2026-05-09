import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js';
import Appointment from '../models/Appointment.js';

function getWeekdayName(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

function toMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function toTimeString(totalMinutes) {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function buildHalfHourSlots(startTime, endTime) {
  const slots = [];
  for (let current = startTime; current + 30 <= endTime; current += 30) {
    slots.push({ start: toTimeString(current), end: toTimeString(current + 30) });
  }
  return slots;
}

export async function listDoctors(req, res) {
  const { q, specialization, rating, language, experience, availability } = req.query;
  const profileQuery = {};
  if (q) profileQuery.$text = { $search: q };
  if (specialization) profileQuery.specialization = specialization;
  if (rating) profileQuery['rating.average'] = { $gte: Number(rating) };
  if (language) profileQuery.languages = language;
  if (experience) profileQuery.experienceYears = { $gte: Number(experience) };
  if (availability) profileQuery['availableSlots.day'] = availability;
  const profiles = await DoctorProfile.find(profileQuery).populate({ path: 'user', match: { isApproved: true, isBlocked: false }, select: 'name email avatar phone' });
  res.json(profiles.filter((profile) => profile.user));
}

export async function getDoctor(req, res) {
  const doctor = await DoctorProfile.findOne({ user: req.params.id }).populate('user', 'name email avatar phone');
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
  res.json(doctor);
}

export async function approveDoctor(req, res) {
  const user = await User.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true });
  res.json(user);
}

export async function updateSchedule(req, res) {
  const profile = await DoctorProfile.findOneAndUpdate({ user: req.params.id }, { availableSlots: req.body.availableSlots }, { new: true });
  res.json(profile);
}

export async function updateProfile(req, res) {
  const { languages } = req.body;
  const profile = await DoctorProfile.findOne({ user: req.params.id });
  if (!profile) return res.status(404).json({ message: 'Doctor not found' });

  if (req.user.role === 'doctor' && req.user._id.toString() !== req.params.id) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  profile.languages = Array.isArray(languages) ? languages : typeof languages === 'string' && languages ? languages.split(',').map((language) => language.trim()).filter(Boolean) : [];
  await profile.save();
  res.json(profile);
}

export async function getAvailability(req, res) {
  const { date } = req.query;
  if (!date) return res.status(400).json({ message: 'date is required' });

  const selectedDate = new Date(date);
  if (Number.isNaN(selectedDate.getTime())) return res.status(400).json({ message: 'Invalid date' });

  const doctor = await DoctorProfile.findOne({ user: req.params.id }).populate('user', 'name email avatar phone');
  if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

  const weekday = getWeekdayName(selectedDate);
  const schedule = (doctor.availableSlots || []).filter((slot) => slot.day === weekday && slot.isActive !== false);
  const dayStart = new Date(selectedDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(selectedDate);
  dayEnd.setHours(23, 59, 59, 999);

  const appointments = await Appointment.find({
    doctor: req.params.id,
    status: { $in: ['pending', 'confirmed'] },
    scheduledAt: { $gte: dayStart, $lte: dayEnd }
  }).select('scheduledAt durationMinutes');

  const bookedSlots = appointments.map((appointment) => {
    const start = new Date(appointment.scheduledAt);
    const duration = appointment.durationMinutes || 30;
    return {
      start: start.getHours() * 60 + start.getMinutes(),
      end: start.getHours() * 60 + start.getMinutes() + duration
    };
  });

  const availability = schedule.flatMap((slot) => {
    const slotStart = toMinutes(slot.start);
    const slotEnd = toMinutes(slot.end);
    return buildHalfHourSlots(slotStart, slotEnd)
      .filter((candidate) => {
        const candidateStart = toMinutes(candidate.start);
        const candidateEnd = toMinutes(candidate.end);
        return !bookedSlots.some((booked) => candidateStart < booked.end && candidateEnd > booked.start);
      })
      .map((candidate) => ({ ...candidate, day: weekday, date: selectedDate.toISOString().slice(0, 10) }));
  });

  res.json({
    date: selectedDate.toISOString().slice(0, 10),
    day: weekday,
    schedule,
    availability
  });
}
