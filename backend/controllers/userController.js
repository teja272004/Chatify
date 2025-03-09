const User = require("../models/User"); // Import User Model
const Message = require("../models/Message"); // Import Message Model

// ✅ Search Users
const searchUsers = async (req, res) => {
    try {
      const query = req.params.username; // 🔥 Change from req.query to req.params
      const users = await User.find({ username: { $regex: query, $options: "i" } });
  
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Server Error", error });
    }
  };
  

// ✅ Add Friend
const addFriend = async (req, res) => {
  try {
    const { friendId } = req.body;
    const user = await User.findById(req.user.id);
    if (!user.friends.includes(friendId)) {
      user.friends.push(friendId);
      await user.save();
    }
    res.json({ message: "Friend Added" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// ✅ Get Friends
const getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("friends", "username");
    res.json(user.friends);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// ✅ Send Message
const sendMessage = async (req, res) => {
  try {
    const { recipientId, text } = req.body;
    const newMessage = new Message({
      sender: req.user.id,
      recipient: recipientId,
      text,
    });
    await newMessage.save();
    res.json(newMessage);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// ✅ Get Messages
const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user.id, recipient: req.params.friendId },
        { sender: req.params.friendId, recipient: req.user.id },
      ],
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// ✅ Export all functions
module.exports = { searchUsers, addFriend, getFriends, sendMessage, getMessages };
