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

// const srcUrl = "https://s3.eu-north-1.amazonaws.com/hranker.test/testranking/bank/10/10.mpd"

const updateDebugInfo = (player: dashjs.MediaPlayerClass) => {
  const bufferLevel = player.getBufferLength("video")
  const playbackRate = player.getPlaybackRate()
  const currentLatency = player.getCurrentLiveLatency()
  const currentQuality = player.getQualityFor("video")
  const availableQualities = player.getBitrateInfoListFor("video")
  const streamInfo = player.getActiveStream()?.getStreamInfo()
  return streamInfo
    ? `Buffer: ${bufferLevel.toFixed(2)}s, Rate: ${playbackRate}x, Latency: ${currentLatency.toFixed(2)}s, ` +
        `Quality: ${currentQuality}, Available Qualities: ${availableQualities.length}, ` +
        `Stream Type: ${streamInfo.manifestInfo}, Duration: ${streamInfo.manifestInfo.duration}`
    : "Stream not initialized"
}
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
  const [warnings, setWarnings] = useState<string[]>([])
  const debugInfoRef = useRef<string>("")
  const lastUpdateTimeRef = useRef<number>(0)
  const [showTechDetails, setShowTechDetails] = useState(false)
  const [chunkDemuxerError, setChunkDemuxerError] = useState<string | null>(null)
  const retryPlaybackRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    retryPlaybackRef.current = () => {
      if (player) {
        console.log("Retrying playback...")
        player.attachSource(srcUrl)
        player.play()

        // Set up a listener for the 'playing' event
        const handlePlaying = () => {
          console.log("Playback started successfully")
          setChunkDemuxerError(null)
          videoRef.current?.removeEventListener("playing", handlePlaying)
        }

        videoRef.current?.addEventListener("playing", handlePlaying)

        // Set up a timeout to check if playback hasn't started
        const playbackTimeout = setTimeout(() => {
          if (videoRef.current?.paused) {
            console.error("Failed to start playback")
            // You might want to set an error state here
          }
        }, 5000) // 5 seconds timeout

        return () => {
          clearTimeout(playbackTimeout)
          videoRef.current?.removeEventListener("playing", handlePlaying)
        }
      }
    }
  }, [player, srcUrl])

  const initializePlayer = useCallback(() => {
    if (videoRef.current) {
      const dashPlayer = dashjs.MediaPlayer().create()
      dashPlayer.initialize(videoRef.current, srcUrl, true)
      dashPlayer.updateSettings({
        debug: {
          // logLevel: dashjs.Debug.LOG_LEVEL_WARNING,
        },
        streaming: {
          buffer: {
            fastSwitchEnabled: true,
          },
          abr: {
            autoSwitchBitrate: { video: true },
          },
          liveCatchup: {
            enabled: true,
          },
        },
      })

      if (dashPlayer.on) {
        dashPlayer.on(dashjs.MediaPlayer.events.MANIFEST_LOADED, () => {
          console.log("Manifest loaded")
          debugInfoRef.current = updateDebugInfo(dashPlayer)
        })
        dashPlayer.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
          console.log("Stream initialized")
          const isDynamic = dashPlayer.isDynamic()
          console.log("Stream initialized. Is live:", isDynamic)
          setIsLive(isDynamic)
          if (isDynamic) {
            dashPlayer.play()
            setIsPlaying(true)
          } else if (videoRef.current) {
            setDuration(videoRef.current.duration)
          }
          debugInfoRef.current = updateDebugInfo(dashPlayer)
        })

        dashPlayer.on(dashjs.MediaPlayer.events.BUFFER_LOADED, () => {
          debugInfoRef.current = updateDebugInfo(dashPlayer)
        })
        dashPlayer.on(dashjs.MediaPlayer.events.PLAYBACK_RATE_CHANGED, () => {
          debugInfoRef.current = updateDebugInfo(dashPlayer)
        })

        const handleError = (error: any) => {
          console.error("Dash.js error:", error)
          setChunkDemuxerError("Your class is about to start. Please wait while we prepare the video.")
          retryPlaybackRef.current?.()
          debugInfoRef.current += `\nError: ${JSON.stringify(error, null, 2)}`
        }

        dashPlayer.on(dashjs.MediaPlayer.events.ERROR, handleError)
      } else {
        console.error("Dash.js player does not have 'on' method")
      }

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
  }, [srcUrl])

  useEffect(() => {
    const cleanup = initializePlayer()
    return () => {
      if (cleanup) cleanup()
    }
  }, [initializePlayer])

  useEffect(() => {
    if (player) {
      const handleStreamInitialized = () => {
        const isDynamic = player.isDynamic()
        console.log("Stream initialized. Is live:", isDynamic)
        setIsLive(isDynamic)
        if (!isDynamic && videoRef.current) {
          setDuration(videoRef.current.duration)
        }
        debugInfoRef.current = updateDebugInfo(player)
      }

      player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, handleStreamInitialized)
      return () => {
        player.off(dashjs.MediaPlayer.events.STREAM_INITIALIZED, handleStreamInitialized)
      }
    }
  }, [player, srcUrl])

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
    retryPlaybackRef.current?.()
  }

  useEffect(() => {
    const video = videoRef.current
    if (video) {
      const handlePlay = () => setIsPlaying(true)
      const handlePause = () => setIsPlaying(false)

      video.addEventListener("play", handlePlay)
      video.addEventListener("pause", handlePause)

      // Set initial playing state based on autoplay
      setIsPlaying(!video.paused)

      return () => {
        video.removeEventListener("play", handlePlay)
        video.removeEventListener("pause", handlePause)
      }
    }
  }, [])

  useEffect(() => {
    if (player) {
      const refreshInterval = setInterval(() => {
        if (videoRef.current && !videoRef.current.paused) {
          player.refreshManifest((manifest, error) => {
            if (error) {
              console.error("Error refreshing manifest:", error)
            } else {
              console.log("Manifest refreshed successfully")
            }
          })
        }
      }, 30000) // Refresh every 30 seconds

      return () => clearInterval(refreshInterval)
    }
  }, [player])

  useEffect(() => {
    let retryInterval: NodeJS.Timeout
    if (chunkDemuxerError) {
      retryInterval = setInterval(() => {
        retryPlaybackRef.current?.()
      }, 5000) // Retry every 5 seconds
    }
    return () => {
      if (retryInterval) {
        clearInterval(retryInterval)
      }
    }
  }, [chunkDemuxerError])

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
      {chunkDemuxerError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 text-white text-xl">
          <p>{chunkDemuxerError}</p>
        </div>
      )}
      <video
        ref={videoRef}
        className={`w-full h-full ${chunkDemuxerError ? "hidden" : ""}`}
        onClick={togglePlay}
        playsInline
        preload="auto"
        autoPlay
      >
        Your browser does not support the video tag.
      </video>
      {warnings.length > 0 && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-500 text-white p-2 text-center">
          {warnings.map((warning, index) => (
            <div key={index}>{warning}</div>
          ))}
          <Button onClick={handleReload} variant="ghost" size="sm" className="ml-2 text-white">
            <RefreshCcw className="h-4 w-4 mr-1" /> Reload
          </Button>
        </div>
      )}
      {error && (
        <div className="absolute top-0 left-0 right-0 bg-red-500 text-white p-2 text-center">
          {error}
          <Button onClick={handleReload} variant="ghost" size="sm" className="ml-2 text-white">
            <RefreshCcw className="h-4 w-4 mr-1" /> Reload
          </Button>
        </div>
      )}
      {/* {showTechDetails && debugInfoRef.current && (
        <div className="absolute top-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 text-xs">
          <pre>{debugInfoRef.current}</pre>
          {warnings.map((warning, index) => (
            <div key={index} className="text-yellow-400">
              Warning: {warning}
            </div>
          ))}
        </div>
      )} */}
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
                      {/* <ChevronRight className="ml-auto h-4 w-4" /> */}
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
                      {/* <ChevronRight className="ml-auto h-4 w-4" /> */}
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

