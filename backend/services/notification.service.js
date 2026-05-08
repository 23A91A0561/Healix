import Notification from '../models/Notification.js';
import { sendEmail } from '../utils/email.js';

export async function notify(io, user, payload, email) {
  const notification = await Notification.create({ user, ...payload });
  io?.to(`user:${user}`).emit('notification:new', notification);
  if (email) await sendEmail(email);
  return notification;
}
