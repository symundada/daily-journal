const mongoose = require("mongoose")

const entrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [1, "Title cannot be empty"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    content: {
      type: String,
      required: [true, "Content is required"],
      minlength: [1, "Content cannot be empty"],
      maxlength: [10000, "Content cannot exceed 10000 characters"],
    },
    mood: {
      type: String,
      required: [true, "Mood is required"],
      enum: {
        values: ["happy", "sad", "excited", "calm", "anxious", "grateful", "angry", "neutral"],
        message: "Invalid mood selected",
      },
      index: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: ["Personal", "Work", "Health", "Relationships", "Goals", "Travel", "Learning", "Reflection"],
        message: "Invalid category selected",
      },
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [30, "Tag cannot exceed 30 characters"],
      },
    ],
    wordCount: {
      type: Number,
      min: [0, "Word count cannot be negative"],
      default: 0,
    },
    readingTime: {
      type: Number, // in minutes
      default: 0,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    isPrivate: {
      type: Boolean,
      default: true,
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
    attachments: [
      {
        filename: String,
        originalName: String,
        mimetype: String,
        size: Number,
        url: String,
        uploadDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    location: {
      name: String,
      coordinates: {
        latitude: {
          type: Number,
          min: -90,
          max: 90,
        },
        longitude: {
          type: Number,
          min: -180,
          max: 180,
        },
      },
    },
    weather: {
      condition: String,
      temperature: Number,
      description: String,
      humidity: Number,
      windSpeed: Number,
    },
    sentiment: {
      score: {
        type: Number,
        min: -1,
        max: 1,
      },
      magnitude: {
        type: Number,
        min: 0,
      },
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Compound indexes for better query performance
entrySchema.index({ userId: 1, date: -1 })
entrySchema.index({ userId: 1, mood: 1 })
entrySchema.index({ userId: 1, category: 1 })
entrySchema.index({ userId: 1, createdAt: -1 })
entrySchema.index({ userId: 1, isFavorite: 1 })
entrySchema.index({ date: -1 })

// Text index for search functionality
entrySchema.index(
  {
    title: "text",
    content: "text",
    tags: "text",
  },
  {
    weights: {
      title: 10,
      content: 5,
      tags: 1,
    },
    name: "entry_text_index",
  },
)

// Virtual for user reference
entrySchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
})

// Virtual for formatted date
entrySchema.virtual("formattedDate").get(function () {
  return this.date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
})

// Calculate word count and reading time before saving
entrySchema.pre("save", function (next) {
  // Always calculate word count from content
  if (this.content) {
    const words = this.content
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0)

    this.wordCount = words.length

    // Calculate reading time (average 200 words per minute)
    this.readingTime = Math.ceil(this.wordCount / 200)
  } else {
    this.wordCount = 0
    this.readingTime = 0
  }

  next()
})

// Update user stats after saving entry
entrySchema.post("save", async function () {
  try {
    const User = mongoose.model("User")
    const user = await User.findById(this.userId)
    if (user) {
      await user.updateStats()
    }
  } catch (error) {
    console.error("Error updating user stats:", error)
  }
})

// Update user stats after deleting entry
entrySchema.post("findOneAndDelete", async (doc) => {
  if (doc) {
    try {
      const User = mongoose.model("User")
      const user = await User.findById(doc.userId)
      if (user) {
        await user.updateStats()
      }
    } catch (error) {
      console.error("Error updating user stats after deletion:", error)
    }
  }
})

// Static method to get entries with pagination and filters
entrySchema.statics.getEntriesWithFilters = async function (userId, options = {}) {
  const {
    page = 1,
    limit = 10,
    mood,
    category,
    search,
    startDate,
    endDate,
    sortBy = "date",
    sortOrder = "desc",
    isFavorite,
  } = options

  // Build query
  const query = { userId }

  // Add filters
  if (mood) query.mood = mood
  if (category) query.category = category
  if (typeof isFavorite === "boolean") query.isFavorite = isFavorite

  // Date range filter
  if (startDate || endDate) {
    query.date = {}
    if (startDate) query.date.$gte = new Date(startDate)
    if (endDate) query.date.$lte = new Date(endDate)
  }

  // Search functionality
  if (search) {
    query.$text = { $search: search }
  }

  // Sort options
  const sortOptions = {}
  sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1

  // Execute query with pagination
  const entries = await this.find(query)
    .sort(sortOptions)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .exec()

  // Get total count for pagination
  const total = await this.countDocuments(query)

  return {
    entries,
    pagination: {
      currentPage: Number.parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalEntries: total,
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  }
}

module.exports = mongoose.model("Entry", entrySchema)
