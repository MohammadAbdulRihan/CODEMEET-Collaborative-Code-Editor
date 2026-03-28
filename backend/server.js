const express = require("express");
const app = express();
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");
const ACTIONS = require("./Actions");
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const server = http.createServer(app);
const io = new Server(server);
const prisma = new PrismaClient();

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "frontend", "build")));

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));

const userSocketMap = {};
const socketUserIdMap = {};
const roomSaveTimeouts = new Map();
const pendingRoomDisconnects = new Map();

function getAllConnectedClients(roomId) {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => {
      return {
        socketId,
        username: userSocketMap[socketId],
      };
    }
  );
}

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);
  const handleJoinRoom = async ({ roomId, username, userId }) => {
    if (!roomId) {
      return;
    }

    const resolvedUsername = username || userSocketMap[socket.id] || "Anonymous";
    const resolvedUserId = userId || socketUserIdMap[socket.id] || socket.id;
    const presenceKey = `${roomId}:${resolvedUserId}`;
    const pendingDisconnect = pendingRoomDisconnects.get(presenceKey);
    const isRefreshReconnect = Boolean(pendingDisconnect);

    if (pendingDisconnect) {
      clearTimeout(pendingDisconnect);
      pendingRoomDisconnects.delete(presenceKey);
    }

    userSocketMap[socket.id] = resolvedUsername;
    socketUserIdMap[socket.id] = resolvedUserId;
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username: resolvedUsername,
        userId: resolvedUserId,
        isRefreshReconnect,
        socketId: socket.id,
      });
    });

    try {
      const room = await prisma.room.findUnique({
        where: { id: roomId },
      });

      socket.emit("loadCode", room?.code || "");
      socket.emit("loadChat", room?.chat || "");
    } catch (err) {
      console.error("Error loading code:", err);
      socket.emit("loadCode", null);
      socket.emit("loadChat", null);
    }
  };

  socket.on(ACTIONS.JOIN, handleJoinRoom);
  socket.on("joinRoom", handleJoinRoom);

  const handleCodeChange = ({ roomId, code }) => {
    if (!roomId) {
      return;
    }

    socket.to(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    socket.to(roomId).emit("codeUpdate", code);

    const existingTimeout = roomSaveTimeouts.get(roomId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeout = setTimeout(async () => {
      try {
        await prisma.room.upsert({
          where: { id: roomId },
          update: { code },
          create: { id: roomId, code },
        });
      } catch (err) {
        console.error("Error saving code:", err);
      } finally {
        roomSaveTimeouts.delete(roomId);
      }
    }, 1000);

    roomSaveTimeouts.set(roomId, timeout);
  };

  socket.on(ACTIONS.CODE_CHANGE, handleCodeChange);
  socket.on("codeChange", handleCodeChange);

  // Handle user disconnection
  // This listens for disconnection events and notifies other clients in the room

  socket.on(ACTIONS.SEND_MESSAGE, async ({ roomId, message }) => {
    if (!roomId || !message) {
      return;
    }

    // Broadcast the message to all clients in the room
    // This allows all clients to receive the message in real-time
    // The message can be a chat message or any other type of notification
    // Here, we use the ACTIONS.SEND_MESSAGE action to handle the message sending
    // The message is emitted to all clients in the specified room
    // This is useful for chat functionality or any other real-time communication feature
    socket.in(roomId).emit(ACTIONS.SEND_MESSAGE, { message });

    try {
      const updatedRows = await prisma.$executeRaw`
        UPDATE "Room"
        SET "chat" = COALESCE("chat", '') || ${message}
        WHERE "id" = ${roomId}
      `;

      if (updatedRows === 0) {
        await prisma.room.create({
          data: {
            id: roomId,
            chat: message,
          },
        });
      }
    } catch (err) {
      console.error("Error saving chat:", err);
    }
  });

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms].filter((roomId) => roomId !== socket.id);
    const username = userSocketMap[socket.id];
    const userId = socketUserIdMap[socket.id] || socket.id;

    rooms.forEach((roomId) => {
      const presenceKey = `${roomId}:${userId}`;
      const existingTimeout = pendingRoomDisconnects.get(presenceKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const timeout = setTimeout(() => {
        io.to(roomId).emit(ACTIONS.DISCONNECTED, {
          socketId: socket.id,
          username,
          userId,
          isRefreshReconnect: false,
        });
        pendingRoomDisconnects.delete(presenceKey);
      }, 1500);

      pendingRoomDisconnects.set(presenceKey, timeout);
    });

    delete userSocketMap[socket.id];
    delete socketUserIdMap[socket.id];
    socket.leave();
  });
});

// API endpoint to run code using Judge0

  app.post('/run-code', async (req, res) => {
  const { code, language, input } = req.body;
  
  // Map language to Judge0 language_id
  const languageMap = {
    'java': 62,
    'python': 71,
    'c': 50,
    'cpp': 54,
    'javascript': 63,
    'csharp': 51,
    'php': 68,
    'go': 60,
    'scala': 81,
    'swift': 83,
    'bash': 46,
    'kotlin': 78,
    'typescript': 74,
    // Add more as needed
  };
  
  const language_id = languageMap[language.toLowerCase()];
  if (!language_id) {
    return res.status(400).json({ error: 'Unsupported language' });
  }
  
  try {
    // Submit code to Judge0
    const { data: tokenData } = await axios.post(
      'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true',
      {
        source_code: code,
        language_id,
        stdin: input || '',
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY, // Use API key from .env
        },
      }
    );
    

    res.json({
      output: tokenData.stdout,
      stderr: tokenData.stderr,
      compile_output: tokenData.compile_output,
      status: tokenData.status,
    });
  } catch (err) {
    res.status(500).json({ error: 'Code execution failed', details: err.message });
  }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "build", "index.html"));
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
