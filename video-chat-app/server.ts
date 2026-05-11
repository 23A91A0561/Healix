import { createServer } from "http";
import next from "next";
import { Server } from "socket.io";
import { parse } from "url";

const dev = process.env.NODE_ENV === "development";
const port = Number(process.env.PORT ?? 3000);
const maxRoomSize = 4;

const app = next({ dev });
const handle = app.getRequestHandler();

const rooms = new Map<string, Set<string>>();
const socketToRoom = new Map<string, string>();
const roomVitals = new Map<string, any>(); // Store vitals data per room

const removeSocketFromRoom = (io: Server, socketId: string) => {
  const roomId = socketToRoom.get(socketId);

  if (!roomId) {
    return;
  }

  const members = rooms.get(roomId);

  if (members) {
    members.delete(socketId);

    if (members.size === 0) {
      rooms.delete(roomId);
    }
  }

  socketToRoom.delete(socketId);
  io.to(roomId).emit("user-left", socketId);
};

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url ?? "", true);
      handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception in video-chat-app server:', err);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled promise rejection in video-chat-app server:', reason);
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", ({ roomId }: { roomId?: string }) => {
      const normalizedRoomId = roomId?.trim();

      if (!normalizedRoomId) {
        socket.emit("room-error", "A valid room ID is required.");
        return;
      }

      const existingRoom = socketToRoom.get(socket.id);

      if (existingRoom === normalizedRoomId) {
        return;
      }

      if (existingRoom) {
        removeSocketFromRoom(io, socket.id);
        socket.leave(existingRoom);
      }

      const members = rooms.get(normalizedRoomId) ?? new Set<string>();

      if (members.size >= maxRoomSize) {
        socket.emit("room-full", normalizedRoomId);
        return;
      }

      rooms.set(normalizedRoomId, members);
      members.add(socket.id);
      socketToRoom.set(socket.id, normalizedRoomId);
      socket.join(normalizedRoomId);

      const otherUsers = [...members].filter((memberId) => memberId !== socket.id);

      socket.emit("all-users", otherUsers);
      socket.to(normalizedRoomId).emit("user-joined", socket.id);
    });

    socket.on("offer", ({ target, sdp }) => {
      io.to(target).emit("offer", {
        caller: socket.id,
        sdp,
      });
    });

    socket.on("answer", ({ target, sdp }) => {
      io.to(target).emit("answer", {
        caller: socket.id,
        sdp,
      });
    });

    socket.on("ice-candidate", ({ target, candidate }) => {
      io.to(target).emit("ice-candidate", {
        caller: socket.id,
        candidate,
      });
    });

    socket.on("chat-message", ({ message }: { message?: string }) => {
      const roomId = socketToRoom.get(socket.id);
      const normalizedMessage = message?.trim();

      if (!roomId || !normalizedMessage) {
        return;
      }

      io.to(roomId).emit("chat-message", {
        id: `${socket.id}-${Date.now()}`,
        sender: socket.id,
        message: normalizedMessage,
        timestamp: Date.now(),
      });
    });

    socket.on("leave-room", () => {
      const roomId = socketToRoom.get(socket.id);

      if (!roomId) {
        return;
      }

      socket.leave(roomId);
      removeSocketFromRoom(io, socket.id);
    });

    // Handle vitals data broadcast
    socket.on("vital-data", ({ roomId, vitals }: { roomId?: string; vitals?: any }) => {
      if (!roomId || !vitals) {
        return;
      }

      const normalizedRoomId = roomId.trim();
      
      // Store vitals data for the room
      if (!roomVitals.has(normalizedRoomId)) {
        roomVitals.set(normalizedRoomId, {});
      }
      
      const roomData = roomVitals.get(normalizedRoomId);
      roomData[socket.id] = {
        ...vitals,
        socketId: socket.id,
        timestamp: Date.now(),
      };

      // Broadcast vitals to all users in the room
      io.to(normalizedRoomId).emit("vital-data-update", {
        socketId: socket.id,
        vitals,
        timestamp: Date.now(),
      });
    });

    // Request vitals data from a room
    socket.on("request-vitals", ({ roomId }: { roomId?: string }) => {
      if (!roomId) {
        return;
      }

      const normalizedRoomId = roomId.trim();
      const roomData = roomVitals.get(normalizedRoomId) || {};

      socket.emit("vitals-data", roomData);
    });

    // Clear vitals data when room is closed
    socket.on("close-vitals", ({ roomId }: { roomId?: string }) => {
      if (!roomId) {
        return;
      }

      const normalizedRoomId = roomId.trim();
      roomVitals.delete(normalizedRoomId);
      io.to(normalizedRoomId).emit("vitals-monitoring-stopped");
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      removeSocketFromRoom(io, socket.id);
    });
  });

  httpServer.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
});
