import { Server } from 'socket.io';
import Queue from '../models/Queue.js';
import Chat from '../models/Chat.js';
import Appointment from '../models/Appointment.js';

export function initSockets(server) {
  const io = new Server(server, { cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true } });
  const videoRooms = new Map();
  const socketToVideoRoom = new Map();
  const videoParticipants = new Map();
  const maxVideoRoomSize = 4;

  const emitVideoParticipants = (roomId) => {
    const members = videoRooms.get(roomId) || new Set();
    io.to(`video:${roomId}`).emit('video:participants', members.size);
  };

  const removeSocketFromVideoRoom = (socketId) => {
    const roomId = socketToVideoRoom.get(socketId);
    if (!roomId) return;

    const members = videoRooms.get(roomId);
    if (members) {
      members.delete(socketId);
      if (members.size === 0) videoRooms.delete(roomId);
    }

    socketToVideoRoom.delete(socketId);
    videoParticipants.delete(socketId);
    io.to(`video:${roomId}`).emit('video:user-left', socketId);
    emitVideoParticipants(roomId);
  };

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

    socket.on('video:join-room', ({ roomId, userName, userRole }) => {
      const normalizedRoomId = roomId?.trim();
      if (!normalizedRoomId) {
        socket.emit('video:room-error', 'A valid room ID is required.');
        return;
      }

      const existingRoom = socketToVideoRoom.get(socket.id);
      if (existingRoom === normalizedRoomId) return;

      if (existingRoom) {
        socket.leave(`video:${existingRoom}`);
        removeSocketFromVideoRoom(socket.id);
      }

      const members = videoRooms.get(normalizedRoomId) || new Set();
      if (members.size >= maxVideoRoomSize) {
        socket.emit('video:room-full', normalizedRoomId);
        return;
      }

      console.log(`User joining video room: ${normalizedRoomId} (Name: ${userName}, Role: ${userRole})`);
      videoRooms.set(normalizedRoomId, members);
      members.add(socket.id);
      socketToVideoRoom.set(socket.id, normalizedRoomId);
      videoParticipants.set(socket.id, {
        id: socket.id,
        name: userName?.trim() || 'Participant',
        role: userRole || 'participant',
      });
      socket.join(`video:${normalizedRoomId}`);

      const otherUsers = [...members]
        .filter((memberId) => memberId !== socket.id)
        .map((memberId) => videoParticipants.get(memberId) || { id: memberId, name: 'Participant' });
      
      console.log(`Sending all-users list to ${socket.id}. Count: ${otherUsers.length}`);
      socket.emit('video:all-users', otherUsers);
      socket.to(`video:${normalizedRoomId}`).emit('video:user-joined', videoParticipants.get(socket.id));
      emitVideoParticipants(normalizedRoomId);
    });

    socket.on('video:offer', ({ target, sdp }) => {
      io.to(target).emit('video:offer', { caller: socket.id, sdp });
    });

    socket.on('video:answer', ({ target, sdp }) => {
      io.to(target).emit('video:answer', { caller: socket.id, sdp });
    });

    socket.on('video:ice-candidate', ({ target, candidate }) => {
      io.to(target).emit('video:ice-candidate', { caller: socket.id, candidate });
    });

    socket.on('video:chat-message', ({ message }) => {
      const roomId = socketToVideoRoom.get(socket.id);
      const normalizedMessage = message?.trim();
      if (!roomId || !normalizedMessage) return;

      io.to(`video:${roomId}`).emit('video:chat-message', {
        id: `${socket.id}-${Date.now()}`,
        sender: socket.id,
        senderName: videoParticipants.get(socket.id)?.name || 'Participant',
        message: normalizedMessage,
        timestamp: Date.now(),
      });
    });

    socket.on('video:leave-room', () => {
      const roomId = socketToVideoRoom.get(socket.id);
      if (roomId) socket.leave(`video:${roomId}`);
      removeSocketFromVideoRoom(socket.id);
    });

    socket.on('vital-data', (data) => {
      const { roomId, vitals } = data;
      if (!roomId || !vitals) return;
      socket.to(`video:${roomId}`).emit('vital-data-update', {
        socketId: socket.id,
        vitals,
        timestamp: Date.now()
      });
    });

    socket.on('close-vitals', ({ roomId }) => {
      if (!roomId) return;
      socket.to(`video:${roomId}`).emit('vitals-monitoring-stopped', { socketId: socket.id });
    });

    socket.on('disconnect', () => {
      removeSocketFromVideoRoom(socket.id);
    });
  });
  return io;
}
