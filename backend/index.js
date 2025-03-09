require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const Message = require("./models/Message");
const OpenAI = require("openai");

const app = express();
app.use(express.json());

// ✅ Improved CORS Configuration
const allowedOrigins = [
  "http://localhost:3000", // Local development
  "https://chatify-frontend-a1hh.onrender.com", // Render frontend
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  })
);

// ✅ Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Failed:", err));

// ✅ API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chat", chatRoutes);

// ✅ Test Route
app.get("/", (req, res) => {
  res.send("Chat App Server is Running...");
});

// ✅ Create HTTP Server
const server = http.createServer(app);

// ✅ Improved Socket.io Configuration
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
    transports: ["websocket", "polling"],
  },
});

// ✅ OpenAI API Initialization
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure you have a valid API key in `.env`
});

// ✅ Store Online Users
const onlineUsers = new Map();

// ✅ Socket.io for Real-Time Messaging & Video Calls
io.on("connection", (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  // 📌 User Joins & is Marked as Online
  socket.on("join", (userId) => {
    if (!userId) return;
    socket.join(userId);
    onlineUsers.set(userId, socket.id);
    io.emit("userList", Array.from(onlineUsers.keys())); // Send updated user list
    console.log(`👥 User ${userId} is online`);
  });

  // 📩 Handle Private Messages
  socket.on("private message", async ({ sender, receiver, message }) => {
    console.log(`📩 Message from ${sender} to ${receiver}: ${message}`);

    // ✅ Save message to MongoDB
    const newMessage = new Message({ sender, receiver, message });
    await newMessage.save();

    // ✅ Send message to receiver
    if (onlineUsers.has(receiver)) {
      io.to(onlineUsers.get(receiver)).emit("private message", { sender, message });
    }

    // ✅ Acknowledge message delivery to sender
    socket.emit("message delivered", { receiver });
  });

  // 🔥 AI ChatBot Feature Inside the Connection Event
  socket.on("chat message", async (data) => {
    if (data.receiverId === "ai_bot") {
      try {
        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [{ role: "user", content: data.message }],
        });

        const aiMessage = aiResponse.choices[0].message.content;

        io.to(data.senderId).emit("chat message", {
          sender: "AI",
          text: aiMessage,
        });
      } catch (error) {
        console.error("AI Chat Error:", error);
        io.to(data.senderId).emit("chat message", {
          sender: "AI",
          text: "Sorry, I encountered an error.",
        });
      }
    } else {
      io.to(data.receiverId).emit("chat message", data);
    }
  });

  // 📞 Handle Call Initiation (WebRTC)
  socket.on("callUser", ({ userToCall, signalData, from }) => {
    if (onlineUsers.has(userToCall)) {
      io.to(onlineUsers.get(userToCall)).emit("incomingCall", { signal: signalData, from });

      // Set a timeout for unanswered calls
      const timeout = setTimeout(() => {
        io.to(from).emit("callEnded", { reason: "No answer" });
        io.to(onlineUsers.get(userToCall)).emit("callEnded", { reason: "No answer" });
      }, 30000);

      socket.on("callAnswered", () => clearTimeout(timeout));
      socket.on("callRejected", () => {
        clearTimeout(timeout);
        io.to(from).emit("callEnded", { reason: "Call rejected" });
      });
    }
  });

  // Handle call answer
  socket.on("answerCall", ({ to, signal }) => {
    io.to(onlineUsers.get(to)).emit("callAccepted", signal);
  });

  // Handle call end
  socket.on("endCall", ({ to }) => {
    io.to(onlineUsers.get(to)).emit("callEnded", { reason: "Call ended by peer" });
  });

  // 🔴 Handle User Disconnect
  socket.on("disconnect", () => {
    let disconnectedUser = null;
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        disconnectedUser = userId;
        onlineUsers.delete(userId);
        break;
      }
    }
    io.emit("userList", Array.from(onlineUsers.keys())); // Update user list
    console.log(`❌ User disconnected: ${disconnectedUser}`);
  });
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
