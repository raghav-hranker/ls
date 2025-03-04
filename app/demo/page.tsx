"use client"

import { useEffect, useState } from "react"
import { LIVESTREAM_BACKEND_URL } from "@/config/BaseConstants"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Plus } from "lucide-react"

interface Room {
  roomId: string
  status: string
  clientId: string
  classId: string
}

export default function Demo() {
  const [srcUrl, setSrcUrl] = useState("")
  const [rooms, setRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const handleCreateClick = async () => {
    try {
      const response = await fetch(`${LIVESTREAM_BACKEND_URL}/api/v1/room`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: "test",
          courseId: "test1",
          classId: 12,
          vodPath: srcUrl,
          status: "recorded",
        }),
      })

      const res = await response.json()

      if (response.status === 201) {
        const { room } = res
        const url = `dash/client/${room.clientId}/${room.classId}?roomId=${room.roomId}`
        router.push(url)
      }
    } catch (error) {
      console.error("Error creating room:", error)
    }
  }

  const handleResetRoom = async (roomId: string) => {
    try {
      const response = await fetch(`${LIVESTREAM_BACKEND_URL}/api/v1/room/${roomId}/reset`, {
        method: "POST",
      })
      if (response.ok) {
        fetchRooms()
      }
    } catch (error) {
      console.error("Error resetting room:", error)
    }
  }

  const handleEnterRoom = (room: Room) => {
    const url = `dash/client/${room.clientId}/${room.classId}?roomId=${room.roomId}`
    router.push(url)
  }

  const handleDeleteRoom = async (roomId: string) => {
    try {
      const response = await fetch(`${LIVESTREAM_BACKEND_URL}/api/v1/room/${roomId}`, {
        method: "DELETE",
      })
      if (response.ok) {
        fetchRooms()
      }
    } catch (error) {
      console.error("Error deleting room:", error)
    }
  }

  const fetchRooms = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${LIVESTREAM_BACKEND_URL}/api/v1/room`)
      const res = await response.json()
      setRooms(res)
    } catch (error) {
      console.error("Error fetching rooms:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRooms()
  }, []) // Removed fetchRooms from the dependency array

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">

        <div className="mb-8 flex items-center space-x-4">
          <Input
            type="text"
            placeholder="Enter source URL"
            value={srcUrl}
            onChange={(e) => setSrcUrl(e.target.value)}
            className="flex-grow"
          />
          <Button onClick={handleCreateClick} className="flex items-center">
            <Plus className="mr-2 h-4 w-4" /> Create Room
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1   gap-6">
            {rooms.map((room) => (
              <div key={room.roomId}>
                <div>
                  <div>{room.roomId}</div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status: {room.status}</p>
                </div>
                <div className="flex justify-between w-[50%]">
                  <Button variant="outline" onClick={() => handleResetRoom(room.roomId)}>
                    Reset
                  </Button>
                  <Button variant="secondary" onClick={() => handleEnterRoom(room)}>
                    Enter
                  </Button>
                  <Button variant="destructive" onClick={() => handleDeleteRoom(room.roomId)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

