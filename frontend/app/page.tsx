import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Calendar, Heart, Search } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-indigo-600 rounded-full">
              <BookOpen className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Daily Journal</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Your private space to capture thoughts, track moods, and reflect on your daily experiences.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto p-3 bg-green-100 rounded-full w-fit">
                <Heart className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>Mood Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track your daily emotions with emoji mood indicators and see patterns over time.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto p-3 bg-blue-100 rounded-full w-fit">
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle>Calendar View</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Navigate through your entries with an intuitive calendar interface and date filtering.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto p-3 bg-purple-100 rounded-full w-fit">
                <Search className="h-8 w-8 text-purple-600" />
              </div>
              <CardTitle>Smart Search</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Find specific entries quickly with keyword search and category filtering.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <div className="space-x-4">
            <Button asChild size="lg">
              <Link href="/auth/login">Get Started</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/auth/signup">Create Account</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}