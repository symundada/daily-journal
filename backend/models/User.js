const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },
    preferences: {
      theme: {
        type: String,
        enum: ["light", "dark", "auto"],
        default: "light",
      },
      defaultMood: {
        type: String,
        enum: ["happy", "sad", "excited", "calm", "anxious", "grateful", "angry", "neutral"],
        default: "neutral",
      },
      defaultCategory: {
        type: String,
        default: "Personal",
      },
    },
    stats: {
      totalEntries: { type: Number, default: 0 },
      totalWords: { type: Number, default: 0 },
      streak: { type: Number, default: 0 },
      lastEntryDate: { type: Date, default: null },
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// Indexes
userSchema.index({ createdAt: -1 })
userSchema.index({ isActive: 1 })

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next()
  
  try {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12
    this.password = await bcrypt.hash(this.password, saltRounds)
    next()
  } catch (error) {
    next(error)
  }
})

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

// Update user stats
userSchema.methods.updateStats = async function () {
  const Entry = mongoose.model("Entry")
  const entries = await Entry.find({ userId: this._id })

  this.stats.totalEntries = entries.length
  this.stats.totalWords = entries.reduce((total, entry) => total + entry.wordCount, 0)
  this.stats.lastEntryDate = entries.length > 0 ? entries[0].date : null

  await this.save()
}

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const userObject = this.toObject()
  delete userObject.password
  return userObject
}

module.exports = mongoose.model("User", userSchema)