"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Paperclip } from "lucide-react"
import type Message from "@/models/Message"
import { SOCKET_IO_BACKEND_URL } from "@/config/BaseConstants"
import useSocket from "@/lib/hooks/useSocket"
import useLocalStorage from "@/lib/hooks/useLocalStorage"


interface ChatMessage {
  roomId: string
  roomName: string
  data: {
    message: string
    userId?: string
    timestamp?: number
    type?: "text" | "image" | "pdf"
    fileName?: string
  }
}

function generateUserId() {
  return "user-" + Math.random().toString(36).substr(2, 9)
}

export default function Chat({ messages, roomId }: { messages: Message[]; roomId: string }) {
  const [inputMessage, setInputMessage] = useState("")
  const [chatList, setChatList] = useState<Message[]>(messages)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [userId] = useLocalStorage<string>("userId", generateUserId())
  const [sendMsg, setSendMsg] = useState<any>({})
  const [isUploading, setIsUploading] = useState(false)

  const { socket } = useSocket(SOCKET_IO_BACKEND_URL)

  const handleUserMsgBroadcast = (data: any) => {
    console.log("Message received:", data)
    setChatList((prev: any) => [...prev, data])
  }

  useEffect(() => {
    if (socket) {
      socket.on("userMsgBroadcast", handleUserMsgBroadcast)
    }
    return () => {
      socket?.off("userMsgBroadcast", handleUserMsgBroadcast)
    }
  }, [socket])

  useEffect(() => {
    setChatList([...messages])
  }, [messages])

  const sendMessage = (message: ChatMessage) => {
    console.log("Sending message")
    socket.emit("userMsg", message)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputMessage.trim()) {
      console.log("Submitting message")
      sendMessage({
        roomId: roomId,
        roomName: roomId,
        data: {
          message: inputMessage,
          userId: userId,
          timestamp: new Date().valueOf(),
          type: "text",
        },
      })
      setSendMsg({})
      setInputMessage("")
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setIsUploading(true)
      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string
        const type = file.type.startsWith("image/") ? "image" : file.type === "application/pdf" ? "pdf" : "text"
        const fileName = file.name
        sendMessage({
          roomId,
          roomName: roomId,
          data: {
            message: content,
            userId: userId,
            timestamp: new Date().valueOf(),
            type,
            fileName,
          },
        })
        setIsUploading(false)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-grow mb-4 p-4 border border-neutral-200 rounded-md dark:border-neutral-800">
        {chatList?.map((message, index) => (
          <div key={index} className={`mb-2 ${message.userId === userId ? "text-right" : "text-left"}`}>
            <div
              className={`inline-block p-2 rounded-lg ${message.userId === userId ? "bg-blue-500 text-white" : "bg-gray-200"}`}
            >
              {message.type === "text" && <p>{message.message}</p>}
              {message.type === "image" && (
                <img
                  src={message.message || "/placeholder.svg"}
                  alt="Uploaded image"
                  className="max-w-full h-auto rounded-lg"
                />
              )}
              {message.type === "pdf" && (
                <div>
                  <p>{message.fileName || "PDF file"}</p>
                  <iframe
                    src={`${message.message}#toolbar=0`}
                    className="w-full h-64 rounded-lg"
                    title={message.fileName || "PDF Preview"}
                  />
                  <a
                    href={message.message}
                    download={message.fileName || "document.pdf"}
                    className="text-blue-500 underline mt-2 inline-block"
                  >
                    Download PDF
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
        {isUploading && (
          <div className="text-center mt-2">
            <span className="animate-pulse">Uploading file...</span>
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
              <div className="bg-blue-600 h-2.5 rounded-full w-full animate-[upload_2s_ease-in-out_infinite]"></div>
            </div>
          </div>
        )}
      </ScrollArea>
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <Input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-grow"
        />
        <Button type="button" onClick={() => fileInputRef.current?.click()} variant="outline" size="icon">
          <Paperclip className="h-4 w-4" />
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*,application/pdf"
          style={{ display: "none" }}
        />
        <Button type="submit">Send</Button>
      </form>
      <style jsx>{`
        @keyframes upload {
          0% { width: 0% }
          50% { width: 100% }
          100% { width: 0% }
        }
      `}</style>
    </div>
  )
}

