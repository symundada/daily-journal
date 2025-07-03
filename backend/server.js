const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const dotenv = require("dotenv")
const helmet = require("helmet")
const authRoutes = require("./routes/auth")
const entryRoutes = require("./routes/entries")
const userRoutes = require("./routes/users")

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Debug: Log the MongoDB URI (remove password for security)
console.log("🔍 MongoDB URI check:", process.env.MONGODB_URI ? "✅ Found" : "❌ Missing")
if (process.env.MONGODB_URI) {
  const uriWithoutPassword = process.env.MONGODB_URI.replace(/:([^:@]{1,}@)/, ":****@")
  console.log("🔗 Connection string format:", uriWithoutPassword)
}

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
)

// CORS configuration - Updated to include your Vercel frontend
app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        process.env.FRONTEND_URL || "http://localhost:3000",
        "http://localhost:3000",
        "http://localhost:3001",
        "https://daily-journal-frontend-nt5i8iiv5-symundada-projects.vercel.app", // Your Vercel URL
        "https://daily-journal-frontend-symundada-projects.vercel.app", // Alternative Vercel URL format
        "https://your-frontend-domain.com",
      ]

      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true)

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true)
      } else {
        console.log("❌ CORS blocked origin:", origin)
        callback(null, true) // Temporarily allow all origins for debugging
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    optionsSuccessStatus: 200, // For legacy browser support
  }),
)

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.get("Origin") || "No origin"}`)
  next()
})

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/entries", entryRoutes)
app.use("/api/users", userRoutes)

// Health check route
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Daily Journal API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    database: "MongoDB Atlas",
    mongoUri: process.env.MONGODB_URI ? "✅ Set" : "❌ Missing",
  })
})

// API documentation route
app.get("/api", (req, res) => {
  res.json({
    message: "Daily Journal API",
    version: "1.0.0",
    endpoints: {
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        me: "GET /api/auth/me",
        refresh: "POST /api/auth/refresh",
      },
      entries: {
        getAll: "GET /api/entries",
        create: "POST /api/entries",
        getOne: "GET /api/entries/:id",
        update: "PUT /api/entries/:id",
        delete: "DELETE /api/entries/:id",
        stats: "GET /api/entries/stats/summary",
        calendar: "GET /api/entries/calendar/:year/:month",
      },
      users: {
        profile: "GET /api/users/profile",
        updateProfile: "PUT /api/users/profile",
        dashboard: "GET /api/users/dashboard",
      },
    },
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.stack)

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message)
    return res.status(400).json({ error: "Validation Error", details: errors })
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0]
    return res.status(400).json({ error: `${field} already exists` })
  }

  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Invalid token" })
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Token expired" })
  }

  res.status(err.status || 500).json({
    error: "Something went wrong!",
    message: process.env.NODE_ENV === "development" ? err.message : "Internal server error",
  })
})

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Route not found",
    message: `Cannot ${req.method} ${req.originalUrl}`,
  })
})

// MongoDB Atlas connection with better error handling
const connectDB = async () => {
  try {
    // Check if MONGODB_URI exists
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI environment variable is not set")
    }

    // Validate connection string format
    if (!process.env.MONGODB_URI.startsWith("mongodb://") && !process.env.MONGODB_URI.startsWith("mongodb+srv://")) {
      throw new Error(`Invalid MongoDB URI format: ${process.env.MONGODB_URI.substring(0, 20)}...`)
    }

    console.log("🔄 Attempting to connect to MongoDB Atlas...")

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      bufferCommands: false,
    })

    console.log(`✅ Connected to MongoDB Atlas: ${conn.connection.host}`)

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB connection error:", err)
    })

    mongoose.connection.on("disconnected", () => {
      console.log("⚠️ MongoDB disconnected")
    })

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected")
    })
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message)
    console.error("🔍 Environment variables check:")
    console.error("- MONGODB_URI:", process.env.MONGODB_URI ? "Set" : "Missing")
    console.error("- NODE_ENV:", process.env.NODE_ENV || "Not set")
    process.exit(1)
  }
}

// Connect to database and start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`📱 API Health Check: http://localhost:${PORT}/api/health`)
    console.log(`📚 API Documentation: http://localhost:${PORT}/api`)
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`)
  })
})

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`)

  try {
    await mongoose.connection.close()
    console.log("✅ MongoDB connection closed")
    process.exit(0)
  } catch (error) {
    console.error("❌ Error during shutdown:", error)
    process.exit(1)
  }
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"))
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Promise Rejection:", err.message)
  gracefulShutdown("unhandledRejection")
})

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message)
  gracefulShutdown("uncaughtException")
})
