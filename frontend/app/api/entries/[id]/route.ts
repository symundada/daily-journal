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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = verifyToken(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const entry = entries.find((entry) => entry._id === params.id && entry.userId === user.userId)

  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 })
  }

  return NextResponse.json(entry)
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const user = verifyToken(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { title, content, mood, category, wordCount } = await request.json()

    const entryIndex = entries.findIndex((entry) => entry._id === params.id && entry.userId === user.userId)

    if (entryIndex === -1) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 })
    }

    entries[entryIndex] = {
      ...entries[entryIndex],
      title,
      content,
      mood,
      category,
      wordCount,
      updatedAt: new Date().toISOString(),
    }

    return NextResponse.json(entries[entryIndex])
  } catch (error) {
    console.error("Update entry error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = verifyToken(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const entryIndex = entries.findIndex((entry) => entry._id === params.id && entry.userId === user.userId)

  if (entryIndex === -1) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 })
  }

  entries.splice(entryIndex, 1)

  return NextResponse.json({ message: "Entry deleted successfully" })
}
