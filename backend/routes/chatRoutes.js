const express = require("express");
const Message = require("../models/Message");
const verifyToken = require("../middleware/authMiddleware"); // Protect routes
const router = express.Router();
const OpenAI = require("openai");

// ✅ Initialize OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ Send a Private Message
router.post("/send", verifyToken, async (req, res) => {
  try {
    const { receiver, message } = req.body;
    const sender = req.user.id;

    if (!receiver || !message) {
      return res.status(400).json({ success: false, message: "Receiver and message are required" });
    }

    const newMessage = new Message({ sender, receiver, message });
    await newMessage.save();

    res.status(201).json({ success: true, message: "Message sent!" });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ success: false, message: "Error sending message" });
  }
});

// ✅ Get Chat Messages Between Two Users
router.get("/:senderId/:receiverId", verifyToken, async (req, res) => {
  try {
    const { senderId, receiverId } = req.params;
    console.log("🔍 Fetching chat messages:", senderId, "↔", receiverId);

    const messages = await Message.find({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId },
      ],
    }).sort("createdAt");

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Error fetching messages" });
  }
});

// ✅ AI Chat Integration
router.post("/ai", verifyToken, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: message }],
    });

    const aiMessage = response.choices[0]?.message?.content || "I couldn't generate a response.";

    res.json({ aiMessage });
  } catch (error) {
    console.error("AI Chat Error:", error);
    res.status(500).json({ error: "AI chat service unavailable" });
  }
});

module.exports = router;
