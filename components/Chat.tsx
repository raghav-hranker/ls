"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Paperclip } from "lucide-react"
import Message from "@/models/Message"
import { SOCKET_IO_BACKEND_URL } from "@/config/BaseConstants"
import useSocket from "@/lib/hooks/useSocket"

interface ChatMessage {
  type: "text" | "image" | "pdf"
  content: string
  sender: "user" | "other"
}

export default function Chat({ messages }: { messages: Message[] }) {
  // const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState("")
  const [chatList, setChatList] = useState<any>(messages); 
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [userId, setUserId] = useState<string>()

  const [,setSocket] = useState<WebSocket | null>(null)
  const {socket} = useSocket(SOCKET_IO_BACKEND_URL)

  useEffect(() => {
    if (!userId) {
        setUserId('user-' + new Date().valueOf());
    }
    if (socket) {
        // Join a room 
        socket.on('userMsgBroadcast', sendMessage); 
    }
    return () => {
        socket?.off('userMsgBroadcast', sendMessage);
    };
}, [socket])

  // useEffect(() => {
  //   const ws = new WebSocket(SOCKET_IO_BACKEND_URL)

  //   ws.onopen = () => {
  //     console.log("WebSocket connection established")
  //   }

  //   ws.onmessage = (event) => {
  //     const message = JSON.parse(event.data)
  //     setChatList((prev: any) => [...prev, message]);
  //   }

  //   ws.onerror = (error) => {
  //     console.error("WebSocket error:", error)
  //   }

  //   ws.onclose = () => {
  //     console.log("WebSocket connection closed")
  //   }

  //   setSocket(ws)

  //   return () => {
  //     ws.close()
  //   }
  // }, [])

  const sendMessage = (message: ChatMessage) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.emit('userMsg',JSON.stringify(message))
      setChatList((prevMessages: any) => [...prevMessages, message])
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputMessage.trim()) {
      console.log('message')
      sendMessage({ type: "text", content: inputMessage, sender: "user" })
      setInputMessage("")
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string
        const type = file.type.startsWith("image/") ? "image" : file.type === "application/pdf" ? "pdf" : "text"
        sendMessage({ type, content, sender: "user" })
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-grow mb-4 p-4 border border-neutral-200 rounded-md dark:border-neutral-800">
        {messages?.map((message, index) => (
          <div key={index} className={`mb-2 ${message.sender === "user" ? "text-right" : "text-left"}`}>
            <div
              className={`inline-block p-2 rounded-lg ${message.sender === "user" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
            >
              {message.type === "text" && <p>{message.content}</p>}
              {message.type === "image" && (
                <img
                  src={message.content || "/placeholder.svg"}
                  alt="Uploaded image"
                  className="max-w-full h-auto rounded-lg"
                />
              )}
              {message.type === "pdf" && (
                <div>
                  <p>PDF file received</p>
                  <a
                    href={message.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 underline"
                  >
                    View PDF
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
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
    </div>
  )
}

