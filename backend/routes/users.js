const express = require("express")
const User = require("../models/User")
const Entry = require("../models/Entry")
const auth = require("../middleware/auth")

const router = express.Router()

// @route   GET /api/users/profile
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password")
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    res.json({ user })
  } catch (error) {
    console.error("Get profile error:", error)
    res.status(500).json({ error: "Server error while fetching profile" })
  }
})

// @route   GET /api/users/dashboard
router.get("/dashboard", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password")

    const recentEntries = await Entry.find({ userId: req.userId })
      .sort({ date: -1 })
      .limit(5)
      .select("title mood category date wordCount")

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayEntry = await Entry.findOne({
      userId: req.userId,
      date: { $gte: today, $lt: tomorrow },
    })

    await user.updateStats()

    res.json({
      user: {
        name: user.name,
        email: user.email,
        stats: user.stats,
        preferences: user.preferences,
      },
      recentEntries,
      todayEntry: todayEntry ? {
        id: todayEntry._id,
        title: todayEntry.title,
        mood: todayEntry.mood,
        wordCount: todayEntry.wordCount,
      } : null,
      hasWrittenToday: !!todayEntry,
    })
  } catch (error) {
    console.error("Get dashboard error:", error)
    res.status(500).json({ error: "Server error while fetching dashboard data" })
  }
})

module.exports = router