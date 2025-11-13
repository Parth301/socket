import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

const app = express();
app.use(cors());

const server = http.createServer(app);

// =======================================
// SOCKET.IO INITIALIZATION
// =======================================
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Track online users → Map(userId → socketId)
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  // =======================================
  // 1. AUTHENTICATE SOCKET
  // =======================================
  socket.on("auth", ({ userId }) => {
    socket.userId = userId;
    onlineUsers.set(userId, socket.id);
    console.log(`User ${userId} authenticated with socket ${socket.id}`);
  });

  // =======================================
  // 2. JOIN CHAT ROOM (must match frontend)
  // =======================================
  socket.on("join-chat", (chatId) => {
    socket.join(`chat_${chatId}`);
    console.log(`User ${socket.userId} joined room chat_${chatId}`);
  });

  // =======================================
  // 3. LEAVE CHAT ROOM
  // =======================================
  socket.on("leave-chat", (chatId) => {
    socket.leave(`chat_${chatId}`);
    console.log(`User ${socket.userId} left chat_${chatId}`);
  });

  // =======================================
  // 4. SEND REAL-TIME MESSAGE
  // (MUST MATCH frontend: "send-message")
  // =======================================
  socket.on("send-message", (data) => {
    console.log("📩 Message received:", data);

    io.to(`chat_${data.chat_id}`).emit("receive-message", data);
  });

  // =======================================
  // 5. WEBRTC CALL OFFER
  // (P2P Signaling)
  // =======================================
  socket.on("call-offer", ({ chatId, offer, fromUser }) => {
    console.log("📞 Offer received");

    // Send to everyone in the chat room EXCEPT sender
    socket.to(`chat_${chatId}`).emit("call-offer", { offer, fromUser });
  });

  // =======================================
  // 6. WEBRTC CALL ANSWER
  // =======================================
  socket.on("call-answer", ({ chatId, answer, fromUser }) => {
    console.log("📞 Answer received");
    socket.to(`chat_${chatId}`).emit("call-answer", { answer, fromUser });
  });

  // =======================================
  // 7. ICE CANDIDATES
  // =======================================
  socket.on("ice-candidate", ({ chatId, candidate }) => {
    socket.to(`chat_${chatId}`).emit("ice-candidate", { candidate });
  });
  // =======================================
  // 8. DISCONNECT
  // =======================================
  socket.on("disconnect", () => {
    console.log(`❌ ${socket.id} disconnected`);
    if (socket.userId) onlineUsers.delete(socket.userId);
  });
});
// Test endpoint
app.get("/", (req, res) => {
  res.send("PsyConnect Socket Server is running.");
});
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Socket server running on port ${PORT}`));
