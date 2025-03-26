"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import EmojiPicker from 'emoji-picker-react';
import { Smile, Paperclip, Mic, Square } from "lucide-react"
import type Message from "@/models/Message"
import { SOCKET_IO_BACKEND_URL } from "@/config/BaseConstants"
import useSocket from "@/lib/hooks/useSocket"
import useLocalStorage from "@/lib/hooks/useLocalStorage"
import { getFormattedDate } from "@/lib/utils"
import { Send } from "lucide-react"

interface ChatMessage {
  roomId: string
  roomName: string
  data: {
    message: string
    userId?: string
    timestamp?: number
    type?: "text" | "image" | "pdf" | "audio"
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [audioLevels, setAudioLevels] = useState<number[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(null);

  const onEmojiClick = (emojiObject: any) => {
    setInputMessage(prevInput => prevInput + emojiObject.emoji);
  };

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showEmojiPicker && !(event.target as Element).closest('.EmojiPickerReact')) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showEmojiPicker]);

  const visualizeAudio = () => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);

      const levels = Array.from({ length: 50 }, (_, i) => {
        const start = Math.floor(i * dataArray.length / 50);
        const end = Math.floor((i + 1) * dataArray.length / 50);
        const sum = dataArray.slice(start, end).reduce((a, b) => a + b, 0);
        return sum / (end - start) / 255; // Normalize to 0-1
      });

      setAudioLevels(levels);
      animationFrameRef.current = requestAnimationFrame(visualizeAudio);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      // Attach the event listener BEFORE starting the recording
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // When recording stops, process the chunks
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
      };

      mediaRecorderRef.current.start(); // Start recording
      visualizeAudio(); // Start visualization
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      setAudioLevels([]);
      mediaRecorderRef.current.stop(); // This will trigger the onstop event
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
    }
  };




  return (
    <div className="flex flex-col w-full">
      <ScrollArea className="flex-grow mb-4 p-4 border border-neutral-200 rounded-md dark:border-neutral-800">
        {chatList?.map((message, index) => (
          <div
            key={index}
            className={`mb-4 flex  ${message.userId === userId ? "justify-end" : "justify-start"}`}
          >
            <div className="max-w-[90%]">
              <div
                className={`p-1 px-2 rounded-lg ${message.userId === userId && message.type !== "audio"
                  ? "bg-blue-500 text-white rounded-tr-none"
                  : "bg-gray-100 dark:bg-gray-800 rounded-tl-none"
                  }`}
              >
                {message.type === "text" && <p className="break-words">{message.message}</p>}
                {message.type === "image" && (
                  <img
                    src={message.message || "/placeholder.svg"}
                    alt="Uploaded image"
                    className="max-w-full h-auto rounded-lg"
                  />
                )}
                {message.type === "pdf" && (
                  <div>
                    <p className="mb-2 font-medium">{message.fileName || "PDF file"}</p>
                    <iframe
                      src={`${message.message}#toolbar=0`}
                      className="w-full h-64 rounded-lg"
                      title={message.fileName || "PDF Preview"}
                    />
                    <a
                      href={message.message}
                      download={message.fileName || "document.pdf"}
                      className="text-blue-100 hover:text-white underline mt-2 inline-block"
                    >
                      Download PDF
                    </a>
                  </div>
                )}
                {message.type === "audio" && (
                  <div className="audio-message ">
                    <audio
                      src={message.message}
                      controls
                      controlsList="nodownload"
                      className="max-w-full"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center mb-1 text-xs text-gray-500 overflow-auto">
                {message.userId === userId ? (
                  <>
                    <span className="mr-1">{getFormattedDate(message.timestamp, "HH:mm a")}</span>
                  </>
                ) : (
                  <>
                    <span className="truncate">User {message.userId?.split('-')[1]}</span>
                    <span className="ml-1">{getFormattedDate(message.timestamp, "HH:mm  a")}</span>
                  </>
                )}
              </div>
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
      {showEmojiPicker && (
        <div className="absolute  md:bottom-20 bottom-full right-0 md:mb-2">
          <EmojiPicker onEmojiClick={onEmojiClick} autoFocusSearch={false} previewConfig={{ showPreview: false }} />
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex space-x-2 w-full">
        {
          mediaRecorderRef.current && (
            <audio

              src={mediaRecorderRef.current.stream.id}
              controls
              className="hidden"
            />
          )
        }
        {audioBlob ? (

          <div className="flex flex-col items-center space-y-2 p-2 border rounded-lg w-[100%]">
            <audio controls src={URL.createObjectURL(audioBlob)} className="w-full overflow-hidden" />
            <div className="flex gap-1">
              <Button
                variant="default"
                onClick={async () => {
                  const reader = new FileReader();
                  reader.onload = () => {
                    const base64Audio = reader.result as string;
                    sendMessage({
                      roomId,
                      roomName: roomId,
                      data: {
                        message: base64Audio,
                        userId: userId,
                        timestamp: new Date().valueOf(),
                        type: "audio",
                        fileName: "voice-message.webm"
                      },
                    });
                  }
                  reader.readAsDataURL(audioBlob)
                  setAudioBlob(null);
                }}
              >
                Send
              </Button>
              <Button variant="destructive" onClick={() => setAudioBlob(null)}>
                Discard
              </Button>
            </div>
          </div>
        ) : isRecording ? (
          <div className="flex-grow h-12 border rounded-md border-neutral-200 dark:border-neutral-800 bg-background px-3 py-2 overflow-hidden">
            <div className="flex h-full items-center justify-center" style={{ gap: '2px' }}>
              {audioLevels.map((level, index) => (
                <div
                  key={index}
                  className="w-[3px] bg-red-500"
                  style={{
                    height: '100%',
                    transform: `scaleY(${Math.max(0.15, level)})`,
                    transformOrigin: 'center',
                    transition: 'transform 0.05s ease'
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          <Input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-grow w-full flex-1"
          />
        )}
        <div className={`${audioBlob ? 'hidden' : 'flex space-x-1 '}`}>
          <Button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            variant="outline"
            size="icon"
          >
            <Smile className="h-4 w-4" />
          </Button>
          <Button type="button" onClick={() => fileInputRef.current?.click()} variant="outline" size="icon">
            <Paperclip className="h-4 w-4" />
          </Button>
          {inputMessage?.length == 0 &&
            (
              <Button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                variant="outline"
                size="icon"
                className={isRecording ? "bg-red-500 text-white hover:bg-red-600" : ""}
              >
                {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )
          }
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept="image/*,application/pdf"
          style={{ display: "none" }}
        />
        {
          inputMessage?.length > 0 &&

          <Button
            size="icon"
            className="transition-all duration-200 ease-in-out"
            variant="default"
            type="submit"
          >
            <Send className="h-4 w-4" />
          </Button>
        }
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

