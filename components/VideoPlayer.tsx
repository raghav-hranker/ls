"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import dashjs from "dashjs"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  PlayCircle,
  PauseCircle,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  Check,
  ChevronRight,
  RefreshCcw,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"

const qualities = [
  { label: "720p", bitrate: 3000000 },
  { label: "480p", bitrate: 1500000 },
  { label: "360p", bitrate: 800000 },
]
interface DashJsStreamProps { srcUrl: string; status: string; roomId: string; streamStatus: string; fileGenerated: boolean; }
// const srcUrl = "https://s3.eu-north-1.amazonaws.com/hranker.test/tester/bank/12/12.mpd"
export default function VideoPlayer({ srcUrl, status, roomId, streamStatus, fileGenerated }: DashJsStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [player, setPlayer] = useState<dashjs.MediaPlayerClass | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isLive, setIsLive] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [quality, setQuality] = useState("auto")
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [showDebugInfo, setShowDebugInfo] = useState(false)
  const lastUpdateTimeRef = useRef<number>(0)

  const retryPlayback = useCallback(() => {
    if (player) {
      console.log("Retrying playback...")
      player.attachSource(srcUrl)
    }
  }, [player, srcUrl])

  const initializePlayer = useCallback(() => {
    if (videoRef.current) {
      const dashPlayer = dashjs.MediaPlayer().create()
      dashPlayer.initialize(videoRef.current, srcUrl, true)
      dashPlayer.updateSettings({
        debug: {
          logLevel: dashjs.Debug.LOG_LEVEL_WARNING,
        },
        streaming: {
          buffer: {
            bufferTimeAtTopQuality: 30,
            bufferTimeAtTopQualityLongForm: 60,
          },
          abr: {
            autoSwitchBitrate: { video: true },
          },
          liveCatchup: {
            enabled: true,
            maxDrift: 30,
          },
          retryAttempts: {
            MPD: 100,
            XLinkExpansion: 3,
            MediaSegment: 3,
            InitializationSegment: 3,
            BitstreamSwitchingSegment: 3,
            FragmentInfoSegment: 3,
            IndexSegment: 3,
            other: 3,
          },
          retryIntervals: {
            MPD: 1000,
            XLinkExpansion: 1000,
            MediaSegment: 1000,
            InitializationSegment: 1000,
            BitstreamSwitchingSegment: 1000,
            FragmentInfoSegment: 1000,
            IndexSegment: 1000,
            other: 1000,
          },
          lowLatencyEnabled: true,
          liveDelay: 3,
          liveCatchUpMinDrift: 0.05,
          stableBufferTime: 5,
        },
      })

      const updateDebugInfo = () => {
        const bufferLevel = dashPlayer.getBufferLength()
        const playbackRate = dashPlayer.getPlaybackRate()
        const currentLatency = dashPlayer.getCurrentLiveLatency()
        setDebugInfo(
          `Buffer: ${bufferLevel.toFixed(2)}s, Rate: ${playbackRate}x, Latency: ${currentLatency.toFixed(2)}s`,
        )
      }

      dashPlayer.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
        const isDynamic = dashPlayer.isDynamic()
        setIsLive(isDynamic)
        if (!isDynamic) {
          setDuration(videoRef.current!.duration)
        }
        console.log("Stream initialized. Is live:", isDynamic)
        updateDebugInfo()
      })

      dashPlayer.on(dashjs.MediaPlayer.events.BUFFER_LOADED, updateDebugInfo)
      dashPlayer.on(dashjs.MediaPlayer.events.PLAYBACK_RATE_CHANGED, updateDebugInfo)

      const handleError = (error: any) => {
        console.error("Dash.js error:", error)
        if (error.code === 4 || error.message.includes) {
          console.warn("Chunk demuxing error detected. Retrying playback...")
          retryPlayback()
        } else {
          setError(`Playback error: ${error.message || "Unknown error"}`)
        }
        setDebugInfo((prevDebugInfo) => `${prevDebugInfo}\nError: ${error.error || "Unknown error"}`)
      }

      dashPlayer.on(dashjs.MediaPlayer.events.ERROR, handleError)

      dashPlayer.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_RENDERED, (e) => {
        console.log("Quality changed:", e)
        updateDebugInfo()
      })

      setPlayer(dashPlayer)

      // Set up an interval to check if the stream is stuck
      const checkStuckInterval = setInterval(() => {
        if (videoRef.current && !videoRef.current.paused) {
          const currentTime = videoRef.current.currentTime
          if (currentTime === lastUpdateTimeRef.current) {
            console.warn("Stream appears to be stuck. Attempting to recover...")
            dashPlayer.seek(currentTime + 0.1) // Try to nudge the playback forward
          }
          lastUpdateTimeRef.current = currentTime
        }
      }, 5000) // Check every 5 seconds

      return () => {
        clearInterval(checkStuckInterval)
        dashPlayer.destroy()
      }
    }
  }, [])

  useEffect(() => {
    const cleanup = initializePlayer()
    return () => {
      if (cleanup) cleanup()
    }
  }, [initializePlayer])

  useEffect(() => {
    const video = videoRef.current
    if (video) {
      const updateTime = () => {
        setCurrentTime(video.currentTime)
        lastUpdateTimeRef.current = video.currentTime
      }
      video.addEventListener("timeupdate", updateTime)
      return () => video.removeEventListener("timeupdate", updateTime)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault()
          togglePlay()
          break
        case "f":
          e.preventDefault()
          handleFullscreen()
          break
        case "m":
          e.preventDefault()
          toggleMute()
          break
        case "d":
          e.preventDefault()
          if (showDebugInfo) {
            handleDebug(false)
          }
          else {
            handleDebug(true)
          }
        case "arrowleft":
          e.preventDefault()
          handleSeek(currentTime - 5)
          break
        case "arrowright":
          e.preventDefault()
          handleSeek(currentTime + 5)
          break
        case "arrowup":
          e.preventDefault()
          handleVolumeChange(Math.min(volume + 0.1, 1))
          break
        case "arrowdown":
          e.preventDefault()
          handleVolumeChange(Math.max(volume - 0.1, 0))
          break
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [currentTime, volume])

  const togglePlay = () => {
    if (player) {
      if (isPlaying) {
        player.pause()
      } else {
        player.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleDebug = (state: boolean) => {
    setShowDebugInfo(state)
  }

  const handleSeek = (time: number) => {
    if (videoRef.current && !isLive) {
      videoRef.current.currentTime = Math.max(0, Math.min(time, duration))
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleVolumeChange = (newVolume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume
      setVolume(newVolume)
      setIsMuted(newVolume === 0)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      if (isMuted) {
        videoRef.current.volume = volume
        setIsMuted(false)
      } else {
        videoRef.current.volume = 0
        setIsMuted(true)
      }
    }
  }

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        containerRef.current.requestFullscreen()
      }
    }
  }

  const handlePlaybackRateChange = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate
      setPlaybackRate(rate)
    }
  }

  const handleQualityChange = (qualityLabel: string) => {
    if (player) {
      if (qualityLabel === "auto") {
        player.updateSettings({
          streaming: {
            abr: {
              autoSwitchBitrate: { video: true },
            },
          },
        })
      } else {
        const selectedQuality = qualities.find((q) => q.label === qualityLabel)
        if (selectedQuality) {
          player.updateSettings({
            streaming: {
              abr: {
                autoSwitchBitrate: { video: false },
              },
            },
          })
          player.setQualityFor(
            "video",
            player.getBitrateInfoListFor("video").findIndex((b) => b.bitrate === selectedQuality.bitrate),
          )
        }
      }
      setQuality(qualityLabel)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const handleReload = () => {
    if (player) {
      player.attachSource(srcUrl)
    }
  }

  useEffect(() => {
    const video = videoRef.current
    if (video) {
      const handlePlay = () => setIsPlaying(true)
      const handlePause = () => setIsPlaying(false)

      video.addEventListener("play", handlePlay)
      video.addEventListener("pause", handlePause)

      return () => {
        video.removeEventListener("play", handlePlay)
        video.removeEventListener("pause", handlePause)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => {
        if (!isSettingsOpen) {
          setShowControls(false)
        }
      }}
    >
      <video ref={videoRef} className="w-full h-full" onClick={togglePlay}>
        Your browser does not support the video tag.
      </video>
      {error && (
        <div className="absolute top-0 left-0 right-0 bg-red-500 text-white p-2 text-center">
          {error}
          <Button onClick={handleReload} variant="ghost" size="sm" className="ml-2 text-white">
            <RefreshCcw className="h-4 w-4 mr-1" /> Reload
          </Button>
        </div>
      )}
      {debugInfo && (
        <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-xs">{debugInfo}</div>
      )}
      {(showControls || isSettingsOpen) && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Slider
              value={[currentTime]}
              onValueChange={(value) => handleSeek(value[0])}
              max={duration}
              step={1}
              className="flex-grow"
              disabled={isLive}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button onClick={togglePlay} variant="ghost" size="icon" className="text-white">
                {isPlaying ? <PauseCircle className="h-6 w-6" /> : <PlayCircle className="h-6 w-6" />}
              </Button>
              <Button
                onClick={() => handleSeek(currentTime - 10)}
                variant="ghost"
                size="icon"
                className="text-white"
                disabled={isLive}
              >
                <RotateCcw className="h-6 w-6" />
              </Button>
              <Button
                onClick={() => handleSeek(currentTime + 10)}
                variant="ghost"
                size="icon"
                className="text-white"
                disabled={isLive}
              >
                <RotateCw className="h-6 w-6" />
              </Button>
              <Button onClick={toggleMute} variant="ghost" size="icon" className="text-white">
                {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                onValueChange={(value) => handleVolumeChange(value[0])}
                max={1}
                step={0.1}
                className="w-24"
              />
              <span className="text-white text-sm">
                {isLive ? "LIVE" : `${formatTime(currentTime)} / ${formatTime(duration)}`}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <DropdownMenu open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white">
                    <Settings className="h-6 w-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" side="top" align="end">
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <span>Playback Speed</span>
                      <ChevronRight className="ml-auto h-4 w-4" />
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent sideOffset={-5} alignOffset={-5}>
                        {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                          <DropdownMenuItem key={rate} onSelect={() => handlePlaybackRateChange(rate)}>
                            <span>{rate}x</span>
                            {rate === playbackRate && <Check className="ml-auto h-4 w-4" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <span>Quality</span>
                      <ChevronRight className="ml-auto h-4 w-4" />
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent sideOffset={-5} alignOffset={-5}>
                        <DropdownMenuItem onSelect={() => handleQualityChange("auto")}>
                          <span>Auto</span>
                          {quality === "auto" && <Check className="ml-auto h-4 w-4" />}
                        </DropdownMenuItem>
                        {qualities.map((q) => (
                          <DropdownMenuItem key={q.label} onSelect={() => handleQualityChange(q.label)}>
                            <span>{q.label}</span>
                            {quality === q.label && <Check className="ml-auto h-4 w-4" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={handleFullscreen} variant="ghost" size="icon" className="text-white">
                <Maximize className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

