"use client"

import VideoPlayer from "../components/VideoPlayer"
import Chat from "../components/Chat"

export default function Home() {
  return (
    <div className="flex flex-col lg:flex-row h-screen">
      <div className="w-full lg:w-3/4 p-4">
        <VideoPlayer />
      </div>
      <div className="w-full lg:w-1/4 p-4">
        <Chat />
      </div>
    </div>
  )
}

