"use client"

import { useEffect, useRef, useState } from "react"
import useSocket from "../lib/hooks/useSocket"
import { SOCKET_IO_BACKEND_URL } from "../config/BaseConstants"
import type Room from "../models/RoomData"
import type Message from "../models/Message"
import { Mic, MicOff, Maximize, Minimize, RepeatIcon as Record, StopCircle } from "lucide-react"

interface LiveCameraProps {
  roomId: string
  classId: string
  roomData: Room
  messages: Message[]
}
const streamArr: Blob[] = []

export const LiveCamera = ({ roomId, classId, roomData, messages }: LiveCameraProps) => {
  console.log(roomData, "roomData")
  const [recording, setRecording] = useState(false)
  const { socket } = useSocket(SOCKET_IO_BACKEND_URL)
  const [showControls, setShowControls] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [showModal, setShowModal] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  useEffect(() => {
    const startInput = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          // Initialize mute state
          const audioTrack = stream.getAudioTracks()[0]
          if (audioTrack) {
            audioTrack.enabled = !isMuted
          }
        }
      } catch (err) {
        console.error("Error accessing media devices.", err)
      }
    }
    startInput()
  }, [isMuted])

  const handleStartRecording = () => {
    const video = document.getElementById("video") as HTMLVideoElement
    const state = { media: video.srcObject as MediaStream }

    if (socket) {
      socket.emit("joinRoom", roomId)
    }

    if (state.media) {
      if (!recording) {
        mediaRecorderRef.current = new MediaRecorder(state.media, {
          audioBitsPerSecond: 128000,
          videoBitsPerSecond: 2000000,
        })
        mediaRecorderRef.current.ondataavailable = async (ev) => {
          console.log("Binary Stream Available", ev.data)
          socket.emit("binarystream", {
            data: ev.data,
            courseId: roomData.courseId,
            clientId: roomData.clientId,
            classId: roomData.classId,
          })
        }

        mediaRecorderRef.current.start(1000)
        setRecording(true)
      } else {
        handleStopRecording()
      }
    }
  }

  const handleStopRecording = () => {
    setShowModal(true)
  }

  const confirmStopRecording = () => {
    if (mediaRecorderRef.current) {
      const state = { media: (document.getElementById("video") as HTMLVideoElement).srcObject as MediaStream }
      state.media.getTracks().forEach((track) => {
        track.stop()
      })

      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.onstop = () => {
        console.log("Recording stopped")
      }

      mediaRecorderRef.current.removeEventListener("ondataavailable", () => {
        console.log("Binary Stream recording stopped")
      })

      socket.emit("stopRecording", {
        courseId: roomData.courseId,
        clientId: roomData.clientId,
        classId: roomData.classId,
      })

      mediaRecorderRef.current = null
      setRecording(false)
    }
    setShowModal(false)
  }

  const cancelStopRecording = () => {
    setShowModal(false)
  }

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
        setIsFullscreen(false)
      } else {
        containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      }
    }
  }

  const toggleMute = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full  bg-gray-900 rounded-lg overflow-hidden"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <div className="aspect-video">
        <video
          ref={videoRef}
          id="video"
          className="w-full h-full object-contain"
          autoPlay
          playsInline
          muted={isMuted}
        ></video>
      </div>

      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 z-10">
          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              <button
                onClick={handleStartRecording}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full ${
                  recording ? "bg-red-500 hover:bg-red-600" : "bg-blue-500 hover:bg-blue-600"
                } text-white transition-colors duration-300`}
              >
                {recording ? <StopCircle size={20} /> : <Record size={20} />}
                <span>{recording ? "Stop Recording" : "Start Recording"}</span>
              </button>
              {/* <button
                onClick={toggleMute}
                className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors duration-300"
              >
                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button> */}
            </div>
            <button
              onClick={handleFullscreen}
              className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors duration-300"
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">End Recording?</h2>
            <p className="text-gray-600 mb-6">Are you sure you want to stop recording? This action cannot be undone.</p>
            <div className="flex justify-end space-x-4">
              <button
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800 transition-colors duration-300"
                onClick={cancelStopRecording}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white transition-colors duration-300"
                onClick={confirmStopRecording}
              >
                Stop Recording
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default LiveCamera

