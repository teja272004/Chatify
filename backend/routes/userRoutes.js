const express = require("express");
const User = require("../models/User");
const verifyToken = require("../middleware/authMiddleware");

const router = express.Router();

// ✅ Get User's Friend List
router.get("/friends", verifyToken, async (req, res) => {
  try {
      const user = await User.findById(req.user.id).populate("friends", "username email");
      if (!user) {
          return res.status(404).json({ message: "User not found" });
      }
      res.json(user.friends);
  } catch (error) {
      res.status(500).json({ message: "Server error" });
  }
});
// Search users by email or username
router.get("/search", verifyToken, async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.json([]);

    // Find users where the username contains the search query (case-insensitive)
    const users = await User.find({ username: new RegExp(username, "i") }).limit(10);
    res.json(users);
  } catch (err) {
    console.error("Error searching users:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Send a friend request
// Send a friend request
// Send a friend request
router.post("/send-friend-request", verifyToken, async (req, res) => {
  const { recipientId } = req.body; // ID of the user to send request to

  console.log("Friend request API hit");
  console.log("Sender ID:", req.user.id);
  console.log("Recipient ID:", recipientId);

  if (!recipientId) {
      console.log("Recipient ID missing");
      return res.status(400).json({ message: "Recipient ID is required" });
  }

  try {
      const sender = await User.findById(req.user.id);
      const recipient = await User.findById(recipientId);

      if (!sender) {
          console.log("Sender user not found");
          return res.status(404).json({ message: "Sender user not found" });
      }

      if (!recipient) {
          console.log("Recipient user not found");
          return res.status(404).json({ message: "Recipient user not found" });
      }

      // Ensure `friends` and `friendRequests` fields exist
      if (!recipient.friends) recipient.friends = [];
      if (!recipient.friendRequests) recipient.friendRequests = [];

      // Check if already friends
      if (recipient.friends.includes(sender._id)) {
          console.log("Users are already friends");
          return res.status(400).json({ message: "Already friends" });
      }

      // Check if request already sent
      if (recipient.friendRequests.includes(sender._id)) {
          console.log("Friend request already sent");
          return res.status(400).json({ message: "Friend request already sent" });
      }

      // Add sender to recipient's friend request list
      recipient.friendRequests.push(sender._id);
      await recipient.save();

      console.log("Friend request sent successfully");
      res.json({ message: "Friend request sent successfully" });
  } catch (error) {
      console.error("Error sending friend request:", error);
      res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/handle-friend-request", verifyToken, async (req, res) => {
  console.log("Received request body:", req.body); // Debug log
  console.log("I'm in");
  const { senderId, action } = req.body; 

  if (!senderId || !action) {
    return res.status(400).json({ message: "Sender ID and action are required" });
  }
  
  try {
    const user = await User.findById(req.user.id);
    const sender = await User.findById(senderId);

    if (!user || !sender) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.friendRequests.includes(senderId)) {
      return res.status(400).json({ message: "No pending friend request from this user" });
    }

    if (action === "accept") {
      user.friends.push(senderId);
      sender.friends.push(user._id);
      console.log("✅ Friend request accepted");
    } else if (action === "reject") {
      console.log("❌ Friend request rejected");
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }

    user.friendRequests = user.friendRequests.filter(id => id.toString() !== senderId);
    await user.save();
    await sender.save();

    res.json({ message: `Friend request ${action}ed successfully` });
  } catch (error) {
    console.error("Error handling friend request:", error);
    res.status(500).json({ message: "Server error" });
  }
});



// ✅ Send Friend Request (Add Friend)
router.post("/add-friend/:friendId", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const friend = await User.findById(req.params.friendId);

    if (!friend) return res.status(404).json({ message: "User not found" });

    if (!user.friends.includes(friend._id)) {
      user.friends.push(friend._id);
      friend.friends.push(user._id);
      await user.save();
      await friend.save();
    }

    res.json({ message: "Friend added!" });
  } catch (error) {
    res.status(500).json({ message: "Error adding friend" });
  }
});
// ✅ Get Pending Friend Requests
router.get("/friend-requests", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("friendRequests", "username email");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user.friendRequests);
  } catch (error) {
    console.error("Error fetching friend requests:", error);
    res.status(500).json({ message: "Server error" });
  }
});
router.get("/:userId", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ username: user.username });
  } catch (error) {
    console.error("❌ Error fetching user:", error);
    res.status(500).json({ error: "Server error" });
  }
});


module.exports = router;
