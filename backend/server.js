import dotenv from 'dotenv';
dotenv.config({ path: new URL('./.env', import.meta.url), quiet: true });

console.log("Groq Key Exists:", !!process.env.GROQ_API_KEY);

import http from 'http';
const [{ default: app }, { default: connectDB }, { initSockets }, { startReminderJobs }] = await Promise.all([
  import('./src/app.js'),
  import('./config/db.js'),
  import('./sockets/index.js'),
  import('./cron/reminder.cron.js')
]);

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
