import { useEffect, useRef, useState } from "react";
import useSocket from "../lib/hooks/useSocket";
import { SOCKET_IO_BACKEND_URL, SOCKET_IO_LOCAL_URL } from "../config/BaseConstants";
import Room from "../models/RoomData";
// import ChatBox from "./ChatBox";
import Message from "../models/Message";

interface LiveCameraProps {
    roomId: string;
    classId: string;
    roomData: Room;
    messages: Message[];
}
let streamArr: Blob[] = [];

export const LiveCamera = ({ roomId, classId, roomData, messages }: LiveCameraProps) => {
    console.log(roomData, "roomData");
    const [recording, setRecording] = useState(false);
    const { socket } = useSocket(SOCKET_IO_BACKEND_URL);
    const [showControls, setShowControls] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);

    useEffect(() => {
        const video = document.getElementById("video") as HTMLVideoElement;
        const start = document.getElementById("start") as HTMLButtonElement;
        const state = { media: null as MediaStream | null }
        const startInput = async () => {
            if (!state.media) {
                try {
                    state.media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                    video.srcObject = state.media;
                } catch (err) {
                    console.error("Error accessing media devices.", err);
                    return;
                }
            }
        }
        startInput()

    }, [recording]);

    const handleStartRecording = () => {
        const video = document.getElementById("video") as HTMLVideoElement;
        const state = { media: video.srcObject as MediaStream };

        if (socket) {
            socket.emit("joinRoom", roomId);
        }

        if (state.media) {
            if (!recording) {
                mediaRecorderRef.current = new MediaRecorder(state.media, {

                    audioBitsPerSecond: 128000, // 128kbps is sufficient for most streams
                    videoBitsPerSecond: 2000000,
                });
                mediaRecorderRef.current.ondataavailable = async (ev) => {
                    console.log('Binary Stream Available', ev.data);
                    // if (ev.data.size > 0) {
                    //     // const arrayBuffer = await ev.data.arrayBuffer(); // Convert Blob to ArrayBuffer
                    //     // const buffer = Buffer.from(arrayBuffer)
                    //     streamArr.push(ev.data);
                    // }
                    // if (socket) {
                    //     //using client id as stream path
                    //     if (streamArr.length > 10) {
                    //         socket.emit('binarystream', { data: [...streamArr], courseId: roomData.courseId, clientId: roomData.clientId, classId: roomData.classId });
                    //         streamArr = [];
                    //     }
                    // }
                    socket.emit('binarystream', { data: ev.data, courseId: roomData.courseId, clientId: roomData.clientId, classId: roomData.classId });

                };

                mediaRecorderRef.current.start(1000);
                setRecording(true);
            } else {
                if (mediaRecorderRef.current) {

                    state.media.getTracks().forEach(track => {
                        track.stop();
                    });

                    mediaRecorderRef.current.stop();
                    mediaRecorderRef.current.onstop = () => {
                        console.log('Recording stopped');
                    };

                    mediaRecorderRef.current.removeEventListener('ondataavailable', () => {
                        console.log('Binary Stream recording stopped');
                    });
                    // trigger this event with a delay to ensure that the last chunk of data is sent
                    // setTimeout(() => {
                    socket.emit("stopRecording", { courseId: roomData.courseId, clientId: roomData.clientId, classId: roomData.classId });
                    // }, 1000);


                    mediaRecorderRef.current = null;
                    setRecording(false);
                }
            }
        }
    };

    const handleFullscreen = () => {
        if (containerRef.current) {
            if (document.fullscreenElement) {
                document.exitFullscreen()
            } else {
                containerRef.current.requestFullscreen()
            }
        }
    }


    return (
        <div
            ref={containerRef}
            className="w-full "
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
        >

            <video id="video" className="w-full h-3/4 md:aspect-video " autoPlay playsInline muted ></video>

            <button id="start" className="flex justify-center w-full" onClick={handleStartRecording}>
                {recording ? "Stop Recording" : "Start Recording"}
            </button>
            {/* {<ChatBox roomId={roomId} messages={messages} status={status} />} */}

        </div>

    );
};

export default LiveCamera;
