const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// User Signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, username, password } = req.body;

    // ✅ Ensure all fields are provided
    if (!name || !email || !username || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if username already exists
    let user = await User.findOne({ username });
    if (user) return res.status(400).json({ message: "Username already taken" });

    // Check if email already exists
    user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "Email already registered" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    user = new User({ name, email, username, password: hashedPassword });
    await user.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// User Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("🔍 Login request received:", req.body);

    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ User not found for email:", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    console.log("✅ User found:", user);

    if (!user.password) {
      console.error("❌ Error: User exists but has no password stored!");
      return res.status(500).json({ message: "User account error: No password stored." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("❌ Password mismatch for user:", email);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    console.log("✅ Login successful for:", user.email);
    res.json({ message: "Login successful", token, user });

  } catch (error) {
    console.error("❌ Server error:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
});
router.get("/getUser/:username", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select("_id username email");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});



module.exports = router;
