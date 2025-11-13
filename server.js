import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

const app = express();
app.use(cors());

const server = http.createServer(app);

// =============================
// SOCKET.IO SERVER INITIALIZED
// =============================
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Track users online -> { userId: socketId }
const onlineUsers = new Map();

io.on("connection", (socket) => {
    console.log("🔌 Socket connected:", socket.id);

    // ===========================================
    // 1. USER AUTHENTICATES THEIR SOCKET CONNECTION
    // ===========================================
    socket.on("auth", ({ userId }) => {
        socket.userId = userId;
        onlineUsers.set(userId, socket.id);

        console.log(`User ${userId} registered with socket ${socket.id}`);
    });

    // ===========================================
    // 2. JOIN CHAT ROOM
    // ===========================================
    socket.on("joinChat", (chatId) => {
        socket.join(`chat_${chatId}`);
        console.log(`User ${socket.userId} joined chat_${chatId}`);
    });

    // ===========================================
    // 3. SEND MESSAGE REAL-TIME
    // ===========================================
    socket.on("sendMessage", (data) => {
        console.log("Message received:", data);
        io.to(`chat_${data.chatId}`).emit("receiveMessage", data);
    });

    // ===========================================
    // 4. WEBRTC CALL OFFER (SENDER → RECEIVER)
    // ===========================================
    socket.on("call-offer", (data) => {
        const targetSocket = onlineUsers.get(data.to);

        if (targetSocket) {
            io.to(targetSocket).emit("call-offer", {
                from: socket.userId,
                sdp: data.sdp,
                chatId: data.chatId
            });
        }
    });

    // ===========================================
    // 5. WEBRTC CALL ANSWER
    // ===========================================
    socket.on("call-answer", (data) => {
        const targetSocket = onlineUsers.get(data.to);

        if (targetSocket) {
            io.to(targetSocket).emit("call-answer", {
                from: socket.userId,
                sdp: data.sdp
            });
        }
    });

    // ===========================================
    // 6. WEBRTC ICE CANDIDATES
    // ===========================================
    socket.on("ice-candidate", (data) => {
        const targetSocket = onlineUsers.get(data.to);

        if (targetSocket) {
            io.to(targetSocket).emit("ice-candidate", {
                from: socket.userId,
                candidate: data.candidate
            });
        }
    });

    // ===========================================
    // 7. HANDLE DISCONNECT
    // ===========================================
    socket.on("disconnect", () => {
        console.log(`❌ ${socket.id} disconnected.`);
        if (socket.userId) onlineUsers.delete(socket.userId);
    });
});

// Serve any test endpoint
app.get("/", (req, res) => {
    res.send("PsyConnect Socket Server is running.");
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Socket server live on port ${PORT}`));