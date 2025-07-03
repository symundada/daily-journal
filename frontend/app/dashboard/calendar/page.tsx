"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

interface JournalEntry {
  _id: string
  title: string
  mood: string
  category: string
  date: string
  wordCount: number
}

interface CalendarData {
  year: number
  month: number
  entries: { [key: string]: JournalEntry[] }
  totalEntries: number
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

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export default function CalendarPage() {
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEntries, setSelectedEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/auth/login")
      return
    }
    fetchCalendarData()
  }, [router, currentDate])

  const fetchCalendarData = async () => {
    setLoading(true)
    setError("")
    try {
      const token = localStorage.getItem("token")
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth() + 1

      console.log(`Fetching calendar data for ${year}/${month}`)

      const response = await fetch(`https://daily-journal-production-3e63.up.railway.app/api/entries/calendar/${year}/${month}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Calendar data received:", data)
        setCalendarData(data)
      } else if (response.status === 401) {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        router.push("/auth/login")
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to fetch calendar entries")
      }
    } catch (error) {
      console.error("Failed to fetch calendar data:", error)
      setError("Network error. Please make sure the backend server is running.")
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getEntriesForDate = (date: Date) => {
    if (!calendarData) return []
    const dateString = date.toISOString().split("T")[0]
    return calendarData.entries[dateString] || []
  }

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    setSelectedDate(clickedDate)
    setSelectedEntries(getEntriesForDate(clickedDate))
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
    setSelectedDate(null)
    setSelectedEntries([])
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days = []

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 border border-gray-200"></div>)
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dayEntries = getEntriesForDate(date)
      const isSelected =
        selectedDate &&
        selectedDate.getDate() === day &&
        selectedDate.getMonth() === currentDate.getMonth() &&
        selectedDate.getFullYear() === currentDate.getFullYear()

      days.push(
        <div
          key={day}
          className={`h-24 border border-gray-200 p-2 cursor-pointer hover:bg-gray-50 transition-colors ${
            isSelected ? "bg-indigo-50 border-indigo-300" : ""
          }`}
          onClick={() => handleDateClick(day)}
        >
          <div className="font-medium text-sm mb-1">{day}</div>
          <div className="space-y-1">
            {dayEntries.slice(0, 2).map((entry, index) => (
              <div key={index} className="flex items-center space-x-1">
                <span className="text-xs">{moodEmojis[entry.mood]}</span>
                <div className="text-xs bg-indigo-100 text-indigo-800 px-1 rounded truncate">{entry.title}</div>
              </div>
            ))}
            {dayEntries.length > 2 && <div className="text-xs text-gray-500">+{dayEntries.length - 2} more</div>}
          </div>
        </div>,
      )
    }

    return days
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">Loading calendar...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="text-red-600 mb-4">{error}</div>
            <Button onClick={fetchCalendarData}>Try Again</Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Journal Calendar</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </CardTitle>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-0 mb-4">
                  {dayNames.map((day) => (
                    <div key={day} className="p-2 text-center font-medium text-gray-600 border-b">
                      {day}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0 border">{renderCalendar()}</div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedDate ? `Entries for ${selectedDate.toLocaleDateString()}` : "Select a date"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedEntries.length > 0 ? (
                  <div className="space-y-4">
                    {selectedEntries.map((entry) => (
                      <div key={entry._id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{entry.title}</h4>
                          <span className="text-lg">{moodEmojis[entry.mood]}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Badge variant="secondary" className="text-xs">
                            {entry.category}
                          </Badge>
                          <span>{entry.wordCount} words</span>
                        </div>
                        <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto" asChild>
                          <Link href={`/dashboard/entry/${entry._id}`}>Read more →</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : selectedDate ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No entries for this date</p>
                    <Button size="sm" asChild>
                      <Link href="/dashboard/new-entry">Write an entry</Link>
                    </Button>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Click on a date to view entries</p>
                )}
              </CardContent>
            </Card>

            {calendarData && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-lg">Month Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">{calendarData.totalEntries}</div>
                    <div className="text-sm text-gray-600">
                      {calendarData.totalEntries === 1 ? "entry" : "entries"} this month
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
