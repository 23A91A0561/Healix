import cron from 'node-cron';
import MedicineReminder from '../models/MedicineReminder.js';
import { notify } from '../services/notification.service.js';

export function startReminderJobs(io) {
  cron.schedule('*/30 * * * *', async () => {
    const now = new Date();
    const reminders = await MedicineReminder.find({ status: 'active', endDate: { $gte: now } }).limit(100);
    for (const reminder of reminders) {
      await notify(io, reminder.patient, {
        title: 'Medicine reminder',
        type: 'medicine',
        message: `Time to take ${reminder.medicineName}`
      });
    }
    await MedicineReminder.updateMany({ status: 'active', endDate: { $lt: now } }, { status: 'completed' });
  });
}
