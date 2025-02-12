import { useRef, useEffect, useState } from "react";
// import ChatBox from './ChatBox';
import useSocket from '../lib/hooks/useSocket.js';
import Message from "../models/Message.js";

interface DashJsStreamProps {
    srcUrl: string;
    status: string;
    roomId: string;
    streamStatus: string;
    messages: Message[];
    displayMessages: (currentTime: number) => void;
    fileGenerated: boolean;
}

const
 DashJsStream = ({ srcUrl, status, roomId, streamStatus, messages, displayMessages, fileGenerated }: DashJsStreamProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [qualities, setQualities] = useState<number[]>([]);
    const [playerInstance, setPlayerInstance] = useState<any>(null);
    const [streamStarted, setStreamStarted] = useState(false);
    const [error, setError] = useState(false)
    const [retryCount, setRetryCount] = useState(0);

    const autoplayAttempted = useRef(false);

    useEffect(() => {
        console.log('srcUrl:', srcUrl);
        console.log('status:', status);

        const initializePlayer = async () => {
            const dashjs = await import("dashjs");
            // const Plyr = await import("plyr");
            const dashPlayer = dashjs.MediaPlayer().create();

            if (videoRef.current) {

                dashPlayer.initialize(videoRef.current, srcUrl, true);

                dashPlayer.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
                    console.log('inifializePlayer');

                    console.log('state changed');
                    const bitrates = dashPlayer.getBitrateInfoListFor("video");
                    console.log(bitrates);
                    const qualityOptions = bitrates.map((quality:any) => quality.height);
                    console.log(qualityOptions);
                    // Configure Plyr with quality options
                    const defaultOptions = {
                        controls: status === 'live'
                            ? ["play-large", "play", "current-time", "mute", "volume", "settings", "fullscreen"]
                            : ["play-large", "play", "progress", "current-time", "mute", "volume", "captions", "settings", "pip", "fullscreen", "rewind", "fast-forward"],
                        settings: ["quality"],
                        quality: {
                            default: 360,
                            options: [360, 480, 720],
                            forced: true, // Use Plyr for quality switching
                            onChange: (newQuality: string | number) => {
                                if (newQuality === "auto") {
                                    // dashPlayer.setAutoSwitchQualityFor("video", true); // Enable adaptive quality
                                } else {
                                    // dashPlayer.setAutoSwitchQualityFor("video", false); // Disable adaptive quality
                                    const levelIndex = bitrates.findIndex((level: { height: string | number; }) => level.height === newQuality);
                                    if (levelIndex !== -1) {
                                        dashPlayer.setQualityFor("video", levelIndex); // Set manual quality
                                    }
                                }
                            },
                        },
                    };


                    // Initialize Plyr with dash.js and quality settings
                    if (videoRef.current) {
                        // const plyrInstance = new Plyr.default(videoRef.current, defaultOptions);



                        // setPlayerInstance(plyrInstance);
                    }
                });

                dashPlayer.updateSettings({

                    streaming: {
                        retryIntervals: {
                            MPD: 1000, // Retry MPD (manifest) every 1 second
                            MediaSegment: 1000, // Retry segments every 1 second
                        },
                        retryAttempts: {
                            MPD: 10, // Retry the MPD 10 times
                            MediaSegment: 10, // Retry segments 10 times
                        },
                        abr: {
                            limitBitrateByPortal: true,
                            autoSwitchBitrate: {
                                video: true
                            }
                        }
                    },

                });


                dashPlayer.on(dashjs.MediaPlayer.events.ERROR, (event: { error: any; }) => {
                    console.error("Dash.js error:", event);
                    const { error } = event;
                    // dashPlayer.attachSource(srcUrl);
                    const retryDelay = 500;
                    const maxRetries = 500;
                    setError(true)


                    // console.log('error:', error);
                    const retryAttachSource = () => {
                        if (retryCount < maxRetries) {
                            console.log(`Retrying to attach source... Attempt ${retryCount + 1}`);

                            setRetryCount(retryCount => retryCount + 1);
                        } else {
                            console.error("Max retries reached. Unable to attach source.");
                        }
                    };



                    console.log('error:', error);

                    setTimeout(retryAttachSource, retryDelay);

                    console.log('error:', error);


                });

                dashPlayer.on(dashjs.MediaPlayer.events.MANIFEST_LOADED, () => {
                    console.log('MANIFEST_LOADED');
                    setStreamStarted(true);
                });

                dashPlayer.on(dashjs.MediaPlayer.events.MANIFEST_LOADING_STARTED, () => {
                    console.log('MANIFEST_LOADING_STARTED');
                });

                dashPlayer.on(dashjs.MediaPlayer.events.PLAYBACK_PLAYING, function (e: any) {
                    // Video has started playing!  Change the status.
                    console.log("Playback started!");
                    setError(false)
                    // updateStatus("Playing"); // Example: function to update your UI status
                });


            }

        };

        initializePlayer();


        return () => {
            if (playerInstance) {
                playerInstance.destroy();
            }
        };
    }, [srcUrl, status, streamStatus, fileGenerated, streamStarted, retryCount]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            if (document.fullscreenElement) {
                // Adjust the video style for fullscreen
                if (videoRef.current) {
                    videoRef.current.style.width = "100vw";

                    videoRef.current.style.objectFit = "contain"; // Prevent cutting
                }
            } else {
                // Revert to original styles when exiting fullscreen
                if (videoRef.current) {
                    videoRef.current.style.width = "100%";
                }
            }
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
        };
    }, []);

    useEffect(() => {

        const videoElement = videoRef.current;

        const handleTimeUpdate = () => {
            if (videoElement && !videoElement.paused) {
                const currentTime = videoElement.currentTime;
                displayMessages(currentTime);
            }
        };

        const handleSeeked = () => {
            const currentTime = videoElement?.currentTime || 0;
            // lastMessageRef.current = 0; // Reset for seeking
            displayMessages(currentTime);
        };
        if (status == 'ended') {
            videoElement?.addEventListener('timeupdate', handleTimeUpdate);
            videoElement?.addEventListener('seeked', handleSeeked);
        }

        return () => {
            videoElement?.removeEventListener('timeupdate', handleTimeUpdate);
            videoElement?.removeEventListener('seeked', handleSeeked);
        };
    }, [messages, status]);


    return (
        <>
            {/* {error && (
               
            )} */}
           <div className="flex flex-row w-full">
                <div className="w-full md:w-8/12 flex justify-center items-center" >
                    {error ?
                        <div className="flex justify-center items-center w-full h-full">
                            Your class is about to start soon
                            {/* {<div className="skeleton-chat"></div>} */}
                        </div>
                        : <div className="plyr__video-wrapper w-full">
                            <video
                                muted
                                autoPlay
                                ref={videoRef}
                                controls
                                style={{ visibility: streamStarted ? 'visible' : 'hidden', width: '100%' }}
                                className={`plyr__video-embed no-seekbar' `}
                            ></video>
                        </div>
                    }
                </div>
                {/* {<ChatBox roomId={roomId} messages={messages} status={status} />} */}
            </div>

        </>
    );
};

export default DashJsStream;