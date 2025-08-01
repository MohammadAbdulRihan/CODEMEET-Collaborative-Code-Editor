const express = require("express");
const app = express();
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const ACTIONS = require("./src/Actions");
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static("build"));

const userSocketMap = {};

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
  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    // Broadcast the code change to all clients in the room
    // This allows all clients to receive the updated code in real-time
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  // Handle user disconnection
  // This listens for disconnection events and notifies other clients in the room

  socket.on(ACTIONS.SEND_MESSAGE, ({ roomId, message }) => {
    // Broadcast the message to all clients in the room
    // This allows all clients to receive the message in real-time
    // The message can be a chat message or any other type of notification
    // Here, we use the ACTIONS.SEND_MESSAGE action to handle the message sending
    // The message is emitted to all clients in the specified room
    // This is useful for chat functionality or any other real-time communication feature
    socket.in(roomId).emit(ACTIONS.SEND_MESSAGE, { message });
  });

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });
    delete userSocketMap[socket.id];
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
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
