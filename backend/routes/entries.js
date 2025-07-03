const express = require("express")
const Entry = require("../models/Entry")
const User = require("../models/User")
const auth = require("../middleware/auth")
const { validate, createEntrySchema, updateEntrySchema } = require("../middleware/validation")

const router = express.Router()

// @route   GET /api/entries/stats/summary
// @desc    Get user's journal statistics
// @access  Private
router.get("/stats/summary", auth, async (req, res) => {
  try {
    // Get basic stats
    const totalEntries = await Entry.countDocuments({ userId: req.userId })

    const totalWordsResult = await Entry.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: null, total: { $sum: "$wordCount" } } },
    ])
    const totalWords = totalWordsResult[0]?.total || 0

    // Get mood distribution
    const moodStats = await Entry.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: "$mood", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])

    // Get category distribution
    const categoryStats = await Entry.aggregate([
      { $match: { userId: req.user._id } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ])

    // Get entries by month for the last 12 months
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

    const monthlyStats = await Entry.aggregate([
      {
        $match: {
          userId: req.user._id,
          date: { $gte: twelveMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          count: { $sum: 1 },
          words: { $sum: "$wordCount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ])

    // Get writing streak data
    const streakData = await Entry.aggregate([
      { $match: { userId: req.user._id } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$date" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 365 }, // Last year
    ])

    res.json({
      totalEntries,
      totalWords,
      moodDistribution: moodStats,
      categoryDistribution: categoryStats,
      monthlyActivity: monthlyStats,
      streakData,
      averageWordsPerEntry: totalEntries > 0 ? Math.round(totalWords / totalEntries) : 0,
      userStats: req.user.stats,
    })
  } catch (error) {
    console.error("Get stats error:", error)
    res.status(500).json({ error: "Server error while fetching statistics" })
  }
})

// @route   GET /api/entries/calendar/:year/:month
// @desc    Get entries for calendar view
// @access  Private
router.get("/calendar/:year/:month", auth, async (req, res) => {
  try {
    const { year, month } = req.params
    const startDate = new Date(Number.parseInt(year), Number.parseInt(month) - 1, 1)
    const endDate = new Date(Number.parseInt(year), Number.parseInt(month), 0, 23, 59, 59, 999)

    console.log(`Fetching calendar entries for ${year}-${month}`)
    console.log(`Date range: ${startDate} to ${endDate}`)

    const entries = await Entry.find({
      userId: req.userId,
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .select("title mood category date wordCount isFavorite")
      .sort({ date: 1 })

    console.log(`Found ${entries.length} entries for calendar`)

    // Group entries by date
    const entriesByDate = {}
    entries.forEach((entry) => {
      const dateKey = entry.date.toISOString().split("T")[0]
      if (!entriesByDate[dateKey]) {
        entriesByDate[dateKey] = []
      }
      entriesByDate[dateKey].push(entry)
    })

    res.json({
      year: Number.parseInt(year),
      month: Number.parseInt(month),
      entries: entriesByDate,
      totalEntries: entries.length,
    })
  } catch (error) {
    console.error("Get calendar entries error:", error)
    res.status(500).json({ error: "Server error while fetching calendar entries" })
  }
})

// @route   GET /api/entries/search
// @desc    Advanced search entries
// @access  Private
router.get("/search", auth, async (req, res) => {
  try {
    const { q, mood, category, startDate, endDate, limit = 20 } = req.query

    const query = { userId: req.userId }

    // Text search
    if (q) {
      query.$text = { $search: q }
    }

    // Filters
    if (mood) query.mood = mood
    if (category) query.category = category

    // Date range
    if (startDate || endDate) {
      query.date = {}
      if (startDate) query.date.$gte = new Date(startDate)
      if (endDate) query.date.$lte = new Date(endDate)
    }

    const entries = await Entry.find(query)
      .select("title content mood category date wordCount isFavorite")
      .sort({ score: { $meta: "textScore" }, date: -1 })
      .limit(Number.parseInt(limit))

    res.json({
      entries,
      total: entries.length,
      query: req.query,
    })
  } catch (error) {
    console.error("Search entries error:", error)
    res.status(500).json({ error: "Server error while searching entries" })
  }
})

// @route   GET /api/entries
// @desc    Get all entries for authenticated user with advanced filtering
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const result = await Entry.getEntriesWithFilters(req.userId, req.query)
    res.json(result)
  } catch (error) {
    console.error("Get entries error:", error)
    res.status(500).json({ error: "Server error while fetching entries" })
  }
})

// @route   GET /api/entries/:id
// @desc    Get single entry by ID
// @access  Private
router.get("/:id", auth, async (req, res) => {
  try {
    const entry = await Entry.findOne({
      _id: req.params.id,
      userId: req.userId,
    })

    if (!entry) {
      return res.status(404).json({ error: "Entry not found" })
    }

    res.json(entry)
  } catch (error) {
    console.error("Get entry error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid entry ID" })
    }
    res.status(500).json({ error: "Server error while fetching entry" })
  }
})

// @route   POST /api/entries
// @desc    Create new entry
// @access  Private
router.post("/", auth, validate(createEntrySchema), async (req, res) => {
  try {
    const entryData = {
      ...req.body,
      userId: req.userId,
    }

    const entry = new Entry(entryData)
    await entry.save()

    res.status(201).json({
      message: "Entry created successfully",
      entry,
    })
  } catch (error) {
    console.error("Create entry error:", error)
    res.status(500).json({ error: "Server error while creating entry" })
  }
})

// @route   PUT /api/entries/:id
// @desc    Update entry
// @access  Private
router.put("/:id", auth, validate(updateEntrySchema), async (req, res) => {
  try {
    const entry = await Entry.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true },
    )

    if (!entry) {
      return res.status(404).json({ error: "Entry not found" })
    }

    res.json({
      message: "Entry updated successfully",
      entry,
    })
  } catch (error) {
    console.error("Update entry error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid entry ID" })
    }
    res.status(500).json({ error: "Server error while updating entry" })
  }
})

// @route   PATCH /api/entries/:id/favorite
// @desc    Toggle entry favorite status
// @access  Private
router.patch("/:id/favorite", auth, async (req, res) => {
  try {
    const entry = await Entry.findOne({
      _id: req.params.id,
      userId: req.userId,
    })

    if (!entry) {
      return res.status(404).json({ error: "Entry not found" })
    }

    entry.isFavorite = !entry.isFavorite
    await entry.save()

    res.json({
      message: `Entry ${entry.isFavorite ? "added to" : "removed from"} favorites`,
      entry,
    })
  } catch (error) {
    console.error("Toggle favorite error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid entry ID" })
    }
    res.status(500).json({ error: "Server error while updating favorite status" })
  }
})

// @route   DELETE /api/entries/:id
// @desc    Delete entry
// @access  Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const entry = await Entry.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    })

    if (!entry) {
      return res.status(404).json({ error: "Entry not found" })
    }

    res.json({ message: "Entry deleted successfully" })
  } catch (error) {
    console.error("Delete entry error:", error)
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid entry ID" })
    }
    res.status(500).json({ error: "Server error while deleting entry" })
  }
})

// @route   GET /api/entries/export/json
// @desc    Export all entries as JSON
// @access  Private
router.get("/export/json", auth, async (req, res) => {
  try {
    const entries = await Entry.find({ userId: req.userId }).sort({ date: -1 }).select("-userId -__v")

    const user = await User.findById(req.userId).select("name email")

    const exportData = {
      user: {
        name: user.name,
        email: user.email,
      },
      exportDate: new Date().toISOString(),
      totalEntries: entries.length,
      entries,
    }

    res.setHeader("Content-Type", "application/json")
    res.setHeader("Content-Disposition", "attachment; filename=journal-entries.json")
    res.json(exportData)
  } catch (error) {
    console.error("Export entries error:", error)
    res.status(500).json({ error: "Server error while exporting entries" })
  }
})

module.exports = router
