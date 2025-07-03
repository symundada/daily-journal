const Joi = require("joi")

// User validation schemas
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().trim(),
  email: Joi.string().email().required().lowercase().trim(),
  password: Joi.string().min(6).max(128).required(),
})

const loginSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim(),
  password: Joi.string().required(),
})

// Entry validation schemas
const createEntrySchema = Joi.object({
  title: Joi.string().min(1).max(200).required().trim(),
  content: Joi.string().min(1).max(10000).required(),
  mood: Joi.string().valid("happy", "sad", "excited", "calm", "anxious", "grateful", "angry", "neutral").required(),
  category: Joi.string()
    .valid("Personal", "Work", "Health", "Relationships", "Goals", "Travel", "Learning", "Reflection")
    .required(),
  tags: Joi.array().items(Joi.string().max(30).trim()).max(10).optional(),
  date: Joi.date().optional(),
  isPrivate: Joi.boolean().optional(),
  wordCount: Joi.number().min(0).optional(), // Make wordCount optional
  location: Joi.object({
    name: Joi.string().max(100).optional(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90).optional(),
      longitude: Joi.number().min(-180).max(180).optional(),
    }).optional(),
  }).optional(),
  weather: Joi.object({
    condition: Joi.string().max(50).optional(),
    temperature: Joi.number().optional(),
    description: Joi.string().max(100).optional(),
  }).optional(),
})

const updateEntrySchema = Joi.object({
  title: Joi.string().min(1).max(200).trim().optional(),
  content: Joi.string().min(1).max(10000).optional(),
  mood: Joi.string().valid("happy", "sad", "excited", "calm", "anxious", "grateful", "angry", "neutral").optional(),
  category: Joi.string()
    .valid("Personal", "Work", "Health", "Relationships", "Goals", "Travel", "Learning", "Reflection")
    .optional(),
  tags: Joi.array().items(Joi.string().max(30).trim()).max(10).optional(),
  date: Joi.date().optional(),
  isPrivate: Joi.boolean().optional(),
  wordCount: Joi.number().min(0).optional(), // Make wordCount optional
  location: Joi.object({
    name: Joi.string().max(100).optional(),
    coordinates: Joi.object({
      latitude: Joi.number().min(-90).max(90).optional(),
      longitude: Joi.number().min(-180).max(180).optional(),
    }).optional(),
  }).optional(),
  weather: Joi.object({
    condition: Joi.string().max(50).optional(),
    temperature: Joi.number().optional(),
    description: Joi.string().max(100).optional(),
  }).optional(),
})

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body)
    if (error) {
      const errorMessage = error.details[0].message
      return res.status(400).json({ error: errorMessage })
    }
    next()
  }
}

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  createEntrySchema,
  updateEntrySchema,
}
