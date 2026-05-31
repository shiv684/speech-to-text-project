const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    // Header se token lo
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Please login first.",
      });
    }

    // Token verify karo
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // user info request mein add karo
    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please login again.",
    });
  }
};

module.exports = authMiddleware;