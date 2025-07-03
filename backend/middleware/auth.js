const jwt = require("jsonwebtoken")
const User = require("../models/User")

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access denied. No token provided." })
    }

    const token = authHeader.substring(7)

    if (!token) {
      return res.status(401).json({ error: "Access denied. Invalid token format." })
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      
      const user = await User.findById(decoded.userId).select("-password")
      if (!user) {
        return res.status(401).json({ error: "Token is valid but user no longer exists." })
      }

      if (!user.isActive) {
        return res.status(401).json({ error: "Account has been deactivated." })
      }

      req.user = user
      req.userId = decoded.userId
      next()
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Token has expired. Please login again." })
      } else if (jwtError.name === "JsonWebTokenError") {
        return res.status(401).json({ error: "Invalid token." })
      } else {
        throw jwtError
      }
    }
  } catch (error) {
    console.error("Auth middleware error:", error)
    res.status(500).json({ error: "Server error during authentication." })
  }
}

module.exports = auth