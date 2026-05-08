import { Server } from 'socket.io';
import Queue from '../models/Queue.js';
import Chat from '../models/Chat.js';
import Appointment from '../models/Appointment.js';

export function initSockets(server) {
  const io = new Server(server, { cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true } });
  io.on('connection', (socket) => {
    socket.on('user:join', (userId) => socket.join(`user:${userId}`));
    socket.on('consultation:join', (room) => socket.join(`consultation:${room}`));
    socket.on('session:join-request', async ({ appointment, userId, userName }) => {
      const appointmentRecord = await Appointment.findById(appointment).select('doctor patient');
      if (!appointmentRecord) return;
      socket.join(`consultation:${appointment}`);
      io.to(`user:${appointmentRecord.doctor}`).emit('session:patient-joining', { appointment, patient: userId, patientName: userName });
      io.to(`user:${userId}`).emit('session:waiting-for-doctor', { appointment, doctor: appointmentRecord.doctor });
      io.to(`consultation:${appointment}`).emit('session:status', { appointment, status: 'patient_joined' });
    });
    socket.on('session:doctor-join', async ({ appointment, userId, userName }) => {
      const appointmentRecord = await Appointment.findById(appointment).select('doctor patient');
      if (!appointmentRecord) return;
      socket.join(`consultation:${appointment}`);
      io.to(`consultation:${appointment}`).emit('session:status', { appointment, status: 'doctor_joined', doctor: userId, doctorName: userName });
      io.to(`user:${userId}`).emit('session:connected', { appointment });
    });
    socket.on('queue:join', async ({ doctor, patient, appointment }) => {
      const queue = await Queue.findOneAndUpdate(
        { doctor },
        { $addToSet: { items: { patient, appointment, status: 'waiting' } } },
        { upsert: true, new: true }
      );
      io.to(`user:${doctor}`).emit('queue:update', queue);
      io.to(`user:${patient}`).emit('queue:update', queue);
    });
    socket.on('queue:next', async ({ doctor }) => {
      const queue = await Queue.findOne({ doctor });
      if (!queue) return;
      queue.items.forEach((item) => { if (item.status === 'current') item.status = 'completed'; });
      const next = queue.items.find((item) => item.status === 'waiting');
      if (next) {
        next.status = 'current';
        queue.currentAppointment = next.appointment;
      }
      await queue.save();
      io.to(`user:${doctor}`).emit('queue:update', queue);
      if (next) io.to(`user:${next.patient}`).emit('queue:ready', queue);
    });
    socket.on('chat:message', async (payload) => {
      const message = await Chat.create(payload);
      io.to(`consultation:${payload.appointment}`).emit('chat:message', message);
    });
    ['call:offer', 'call:answer', 'call:ice', 'call:end'].forEach((event) => {
      socket.on(event, ({ room, data }) => socket.to(`consultation:${room}`).emit(event, data));
    });
  });
  return io;
}
