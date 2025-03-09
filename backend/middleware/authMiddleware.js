const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  console.log("🛡️ Verifying Token...");

  // ✅ Ensure Bearer token format is handled correctly
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) {
    console.log("❌ No token provided");
    return res.status(401).json({ message: "Access Denied. No token provided." });
  }

  try {
    // ✅ Use environment variable for secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.userId }; // ✅ Ensure `req.user` is an object
    console.log("✅ Token verified. User ID:", req.user.id);
    next();
  } catch (err) {
    console.log("❌ Invalid Token:", err.message);
    res.status(401).json({ message: "Invalid Token" });
  }
};

module.exports = verifyToken;
