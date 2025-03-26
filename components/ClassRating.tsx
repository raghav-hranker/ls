"use client"

import { useEffect, useState } from "react"
import { Rating } from "./Rating"

interface StreamRatingProps {
  classId: string
  className?: string
}

interface RatingData {
  userRating?: number
}

export default function ClassRating({ classId, className }: StreamRatingProps) {
  const [ratingData, setRatingData] = useState<RatingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRatingData = async () => {
      try {
        setLoading(true)
        // Replace with your actual API call
        // const response = await fetch(`/api/streams/${classId}/ratings`)
        // const data = await response.json()

        // Simulating API response for demonstration
        const mockData: RatingData = {
      
          userRating: 0, // 0 means user hasn't rated yet
        }

        setRatingData(mockData)
      } catch (error) {
        console.error("Failed to fetch rating data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchRatingData()
  }, [classId])

  const handleRatingSubmit = async (classId: string, rating: number) => {
    // Replace with your actual API call
    // await fetch(`/api/streams/${classId}/ratings`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ rating })
    // })

    // Simulate API call with a delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Update local state to reflect the new rating
    if (ratingData) {
      setRatingData({
        userRating: rating,
      })
    }
  }

  if (loading) {
    return <div className="tw-animate-pulse tw-h-40 tw-w-full tw-max-w-sm tw-bg-muted tw-rounded-md"></div>
  }

  if (!ratingData) {
    return null
  }

  return (
    <Rating
      classId={classId}
      initialRating={ratingData.userRating || 0}
      onRatingSubmit={handleRatingSubmit}
      className={className}
    />
  )
}

