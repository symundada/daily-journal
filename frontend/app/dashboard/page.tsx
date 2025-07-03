"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Calendar, Plus, Search, LogOut, BookOpen, Filter } from "lucide-react"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface JournalEntry {
  _id: string
  title: string
  content: string
  mood: string
  category: string
  date: string
  wordCount: number
}

const moodEmojis: { [key: string]: string } = {
  happy: "😊",
  sad: "😢",
  excited: "🤩",
  calm: "😌",
  anxious: "😰",
  grateful: "🙏",
  angry: "😠",
  neutral: "😐",
}

export default function DashboardPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [moodFilter, setMoodFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/auth/login")
      return
    }
    fetchEntries()
  }, [router])

  useEffect(() => {
    filterEntries()
  }, [entries, searchTerm, moodFilter])

  const fetchEntries = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("http://localhost:5000/api/entries", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setEntries(data.entries || [])
      } else if (response.status === 401) {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        router.push("/auth/login")
      } else {
        setError("Failed to fetch entries")
      }
    } catch (error) {
      console.error("Failed to fetch entries:", error)
      setError("Network error. Please make sure the backend server is running.")
    } finally {
      setLoading(false)
    }
  }

  const filterEntries = () => {
    let filtered = entries

    if (searchTerm) {
      filtered = filtered.filter(
        (entry) =>
          entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.content.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (moodFilter !== "all") {
      filtered = filtered.filter((entry) => entry.mood === moodFilter)
    }

    setFilteredEntries(filtered)
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/")
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-indigo-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading your journal...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <Button onClick={fetchEntries}>Try Again</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BookOpen className="h-8 w-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-gray-900">Daily Journal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button asChild>
                <Link href="/dashboard/new-entry">
                  <Plus className="h-4 w-4 mr-2" />
                  New Entry
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/calendar">
                  <Calendar className="h-4 w-4 mr-2" />
                  Calendar
                </Link>
              </Button>
              <Button variant="ghost" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search your entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={moodFilter} onValueChange={setMoodFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by mood" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Moods</SelectItem>
                {Object.entries(moodEmojis).map(([mood, emoji]) => (
                  <SelectItem key={mood} value={mood}>
                    {emoji} {mood.charAt(0).toUpperCase() + mood.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <CardTitle className="text-xl mb-2">
                {entries.length === 0 ? "Start Your Journey" : "No entries found"}
              </CardTitle>
              <CardDescription className="mb-6">
                {entries.length === 0
                  ? "Create your first journal entry to begin capturing your thoughts and experiences."
                  : "Try adjusting your search or filter criteria."}
              </CardDescription>
              {entries.length === 0 && (
                <Button asChild>
                  <Link href="/dashboard/new-entry">
                    <Plus className="h-4 w-4 mr-2" />
                    Write First Entry
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {filteredEntries.map((entry) => (
              <Card key={entry._id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{entry.title}</CardTitle>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{formatDate(entry.date)}</span>
                        <span>{entry.wordCount} words</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{moodEmojis[entry.mood]}</span>
                      <Badge variant="secondary">{entry.category}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 line-clamp-3 mb-4">{entry.content}</p>
                  <div className="flex justify-between items-center">
                    <Badge variant="outline">{entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1)}</Badge>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/dashboard/entry/${entry._id}`}>Read More</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
