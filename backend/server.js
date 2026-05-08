import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import app from './src/app.js';
import connectDB from './config/db.js';
import { initSockets } from './sockets/index.js';
import { startReminderJobs } from './cron/reminder.cron.js';

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const io = initSockets(server);

app.set('io', io);

connectDB().then(() => {
  startReminderJobs(io);
  server.listen(PORT, () => {
    console.log(`Smart Healthcare API running on port ${PORT}`);
  });
});
