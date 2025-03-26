"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import type { LevelSwitchingData } from "hls.js";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  PlayCircle,
  PauseCircle,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Settings,
  Check,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HLSVideoPlayerProps {
  srcUrl: string;
  status: string;
  roomId: string;
  streamStatus: string;
  fileGenerated: boolean;
  hlsConfig?: any;
  autoplay: boolean;
}

const qualities = [
  { label: "720p", bitrate: 3000000 },
  { label: "480p", bitrate: 1500000 },
  { label: "360p", bitrate: 800000 },
];

const HLSVideoPlayer: React.FC<HLSVideoPlayerProps> = ({
  srcUrl,
  status,
  roomId,
  streamStatus,
  fileGenerated,
  hlsConfig,
  isConnected,
  onReconnect,
  autoplay = true,
}) => {
  //   const srcUrl = "https://s3.eu-north-1.amazonaws.com/hranker.test/new/bank/10/playlist-mpl-vod.m3u8"
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLive, setIsLive] = useState(status === "live");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [quality, setQuality] = useState<{ label: string; level: number }>({
    label: "auto",
    level: -1,
  });
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferingTimer, setBufferingTimer] = useState<NodeJS.Timeout | null>(
    null
  );
  const [buffered, setBuffered] = useState<TimeRanges | null>(null);
  const [isBehindLive, setIsBehindLive] = useState(false);

  const defaultHlsConfig = useMemo(
    () => ({
      autoStartLoad: true,
      startPosition: -1,
      debug: false,
      ...hlsConfig,
    }),
    [hlsConfig]
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls(defaultHlsConfig);
      hlsRef.current = hls;
      hls.loadSource(srcUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // video.muted = true
        video.play().catch((error) => {
          console.warn("Autoplay failed:", error);
          // Optionally show a play button or UI indication that autoplay was blocked
        });
      });

      hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
        setIsLive(data.details.live);
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = srcUrl;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch(() => {
          console.log("Autoplay prevented");
        });
      });
    } else {
      console.error("HLS is not supported in this browser.");
    }
  }, [srcUrl, defaultHlsConfig]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);

    video.addEventListener("timeupdate", updateTime);
    video.addEventListener("durationchange", updateDuration);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("canplay", handleCanPlay);

    return () => {
      video.removeEventListener("timeupdate", updateTime);
      video.removeEventListener("durationchange", updateDuration);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, []);

  useEffect(() => {
    setIsLive(status === "live");
  }, [status]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const handleSeek = (time: number) => {
    const video = videoRef.current;
    if (!video || isLive) return;

    video.currentTime = time;
  };

  const handleVolumeChange = (newVolume: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = rate;
    setPlaybackRate(rate);
  }; 

  const handleQualityChange = (qualityLabel: string) => {
    const hls = hlsRef.current;
    if (!hls) return;

    if (qualityLabel === "auto") {
      hls.currentLevel = -1; // Auto quality
      setQuality({ label: "auto", level: -1 });
    } else {
      const levels = hls.levels;
      const selectedLevel = levels?.findIndex(
        (level) =>
          level?.height === Number.parseInt(qualityLabel.replace("p", ""))
      ); // Added optional chaining
      if (selectedLevel !== -1) {
        hls.currentLevel = selectedLevel;
        setQuality({ label: qualityLabel, level: selectedLevel });
      }
    }
  };

  useEffect(() => {
    const player = hlsRef.current;
    if (player) {
      const handleLevelSwitching = (
        event: typeof Hls.Events.LEVEL_SWITCHING,
        data: LevelSwitchingData
      ) => {
        const newLevel = data.level;
        const newQuality =
          newLevel === -1
            ? { label: "auto", level: -1 }
            : {
                label: `${player?.levels[newLevel]?.height}p`,
                level: newLevel,
              };
        setQuality(newQuality); //Corrected this line to set the quality object instead of the label
      };

      player.on(Hls.Events.LEVEL_SWITCHING, handleLevelSwitching);

      return () => {
        player.off(Hls.Events.LEVEL_SWITCHING, handleLevelSwitching);
      };
    }
  }, []);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!isHovering && !isSettingsOpen) {
      const timer = setTimeout(() => setShowControls(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isHovering, isSettingsOpen]);

  const getBufferedRanges = () => {
    if (!buffered || buffered.length === 0) return [];
    const ranges = [];
    for (let i = 0; i < buffered.length; i++) {
      ranges.push({
        start: (buffered.start(i) / duration) * 100,
        end: (buffered.end(i) / duration) * 100,
      });
    }
    return ranges;
  };

  if (streamStatus === "processing" || status === "processing") {
    return (
      <div className="flex items-center justify-center">
        <h1>
          Class has ended, recording will be uploaded shortly, check back soon
        </h1>
      </div>
    );
  }

  useEffect(() => {
    if (!isLive || !videoRef.current) return;

    const checkIfBehindLive = () => {
      const video = videoRef.current;
      if (!video) return;

      // Consider user behind live if they're more than 10 seconds behind
      const behindThreshold = 20;
      const timeFromLive = video.duration - video.currentTime;
      setIsBehindLive(timeFromLive > behindThreshold);
    };

    const video = videoRef.current;
    video.addEventListener("timeupdate", checkIfBehindLive);
    return () => {
      video.removeEventListener("timeupdate", checkIfBehindLive);
    };
  }, [isLive]);

  const goToLive = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = video.duration;
    video.play();
    setIsBehindLive(false);
  };

  return (
    <div
      className="relative w-full aspect-video bg-black"
      onMouseEnter={() => {
        setIsHovering(true);
        setShowControls(true);
      }}
      onMouseLeave={() => {
        setIsHovering(false);
        if (!isSettingsOpen) {
          setShowControls(false);
        }
      }}
    >
      <video ref={videoRef} className="w-full h-full" onClick={togglePlay} />
      {/* {isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center bg-opacity-50">
                    <Loader2 className="w-12 h-12 text-white animate-spin" />
                </div>
            )} */}
      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
          {!isLive && (
            <div className="flex items-center space-x-2 mb-2">
              <Slider
                value={[currentTime]}
                onValueChange={(value) => handleSeek(value[0])}
                max={duration}
                step={1}
                className="flex-grow"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                onClick={togglePlay}
                variant="ghost"
                size="icon"
                className="text-white"
              >
                {isPlaying ? (
                  <PauseCircle className="h-6 w-6" />
                ) : (
                  <PlayCircle className="h-6 w-6" />
                )}
              </Button>
              {!isLive && (
                <>
                  <Button
                    onClick={() => handleSeek(currentTime - 10)}
                    variant="ghost"
                    size="icon"
                    className="text-white"
                  >
                    <RotateCcw className="h-6 w-6" />
                  </Button>
                  <Button
                    onClick={() => handleSeek(currentTime + 10)}
                    variant="ghost"
                    size="icon"
                    className="text-white"
                  >
                    <RotateCw className="h-6 w-6" />
                  </Button>
                </>
              )}
              <Button
                onClick={toggleMute}
                variant="ghost"
                size="icon"
                className="text-white"
              >
                {isMuted ? (
                  <VolumeX className="h-6 w-6" />
                ) : (
                  <Volume2 className="h-6 w-6" />
                )}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                onValueChange={(value) => handleVolumeChange(value[0])}
                max={1}
                step={0.1}
                className="w-24"
              />
              <span className="text-white text-sm">
                {isLive ? (
                  !isBehindLive ? (
                    <> LIVE </>
                  ) : (
                    <Button
                      onClick={goToLive}
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-400 ml-2"
                    >
                      Go Live
                    </Button>
                  )
                ) : (
                  <>
                    {formatTime(currentTime)} / {formatTime(duration)}{" "}
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <DropdownMenu
                open={isSettingsOpen}
                onOpenChange={(open) => {
                  setIsSettingsOpen(open);
                  if (open) {
                    setShowControls(true);
                  } else if (!isHovering) {
                    setShowControls(false);
                  }
                }}
              >
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white">
                    <Settings className="h-6 w-6" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" side="top" align="end">
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <span>Playback Speed</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent sideOffset={-5} alignOffset={-5}>
                        {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                          <DropdownMenuItem
                            key={rate}
                            onSelect={() => handlePlaybackRateChange(rate)}
                          >
                            <span>{rate}x</span>
                            {rate === playbackRate && (
                              <Check className="ml-auto h-4 w-4" />
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <span>Quality</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent sideOffset={-5} alignOffset={-5}>
                        <DropdownMenuItem
                          onSelect={() => handleQualityChange("auto")}
                        >
                          <span>Auto</span>
                          {quality.label === "auto" && (
                            <Check className="ml-auto h-4 w-4" />
                          )}
                        </DropdownMenuItem>
                        {qualities.map((q) => (
                          <DropdownMenuItem
                            key={q.label}
                            onSelect={() => handleQualityChange(q.label)}
                          >
                            <span>{q.label}</span>
                            {quality.label === q.label && (
                              <Check className="ml-auto h-4 w-4" />
                            )}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <ConnectionAlert
            isConnected={isConnected}
            onReconnect={onReconnect}
          />
        </div>
      )}
    </div>
  );
};

import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface HLSVideoPlayerProps {
  srcUrl: string;
  status: string;
  roomId: string;
  streamStatus: string;
  fileGenerated: boolean;
  isConnected?: boolean;
  onReconnect?: () => void;
  hlsConfig?: any;
  autoplay: boolean;
}

const ConnectionAlert = ({
  isConnected,
  onReconnect,
}: {
  isConnected?: boolean;
  onReconnect?: () => void;
}) => {
  if (isConnected === false) {
    return (
      <div className="absolute top-0 left-0 right-0 p-4 z-10">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection lost</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>You may miss updates. Reconnect to continue.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={onReconnect}
              className="ml-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Reconnect
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  return null;
};

export default HLSVideoPlayer;
