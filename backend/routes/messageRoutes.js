const express = require("express");
const Message = require("../models/Message");
const router = express.Router();

// Fetch chat history between two users
router.get("/:userId/:friendId", async (req, res) => {
  try {
    const { userId, friendId } = req.params;
    
    console.log("🔍 Checking messages between:", userId, "and", friendId);

    // Convert userId & friendId to ObjectId
    const senderId = new mongoose.Types.ObjectId(userId);
    const receiverId = new mongoose.Types.ObjectId(friendId);

    const messages = await Message.find({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId }
      ]
    }).sort({ createdAt: 1 });

    if (messages.length === 0) {
      console.log("⚠️ No messages found.");
      return res.json([]);  // ✅ Return an empty array
    }

    console.log("✅ Messages found:", messages.length);
    res.json(messages);
  } catch (error) {
    console.error("❌ Error fetching messages:", error);
    res.status(500).json({ message: "Error fetching messages", error });
  }
});


module.exports = router;
