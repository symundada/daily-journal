import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"

// Mock database - in production, use MongoDB
const entries: any[] = []

function verifyToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }

  const token = authHeader.substring(7)
  try {
    return jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as any
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const user = verifyToken(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userEntries = entries
    .filter((entry) => entry.userId === user.userId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return NextResponse.json(userEntries)
}

export async function POST(request: NextRequest) {
  const user = verifyToken(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { title, content, mood, category, wordCount } = await request.json()

    const entry = {
      _id: Date.now().toString(),
      userId: user.userId,
      title,
      content,
      mood,
      category,
      wordCount,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    entries.push(entry)

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error("Create entry error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
