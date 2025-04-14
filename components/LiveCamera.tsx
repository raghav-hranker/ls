'use client';

import { useEffect, useRef, useState } from 'react';
import useSocket from '../lib/hooks/useSocket';
import { SOCKET_IO_BACKEND_URL } from '../config/BaseConstants';
import type Room from '../models/RoomData';
import type Message from '../models/Message';
import { Mic, MicOff, Maximize, Minimize, RepeatIcon as Record, StopCircle, FlipHorizontal } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
interface LiveCameraProps {
  roomId: string;
  classId: string;
  clientId: string;
  roomData: Room;
  messages: Message[];
}

export const LiveCamera = ({ roomId, classId, roomData, messages, clientId }: LiveCameraProps) => {
  const [recording, setRecording] = useState(false);
  const { socket } = useSocket(SOCKET_IO_BACKEND_URL);
  const [showControls, setShowControls] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const [streamId] = useState<string>(uuidv4());

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const startCamera = async (useFrontCamera = true) => {
    try {
      // Stop any existing tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Get new stream with specified camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: useFrontCamera ? 'user' : 'environment'
        },
        audio: true,
      });
      
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = new MediaStream(stream.getVideoTracks());
      }

      // Set up audio context if it doesn't exist
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Re-create source node with new stream
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }
      
      sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      if (!gainNodeRef.current) {
        gainNodeRef.current = audioContextRef.current.createGain();
      }
      
      sourceNodeRef.current.connect(gainNodeRef.current);

      // Update mute state
      if (gainNodeRef.current && audioContextRef.current) {
        gainNodeRef.current.gain.setValueAtTime(isMuted ? 0 : 1, audioContextRef.current.currentTime);
      }
    } catch (err) {
      console.error('Error accessing media devices.', err);
    }
  };

  useEffect(() => {
    startCamera(isFrontCamera);

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isFrontCamera]); // Added isFrontCamera to dependencies

  const handleStartRecording = () => {
    if (streamRef.current) {
      if (socket) {
        socket.emit('joinRoom', roomId);
      }

      if (!recording) {
        mediaRecorderRef.current = new MediaRecorder(streamRef.current, {
          audioBitsPerSecond: 128000,
          videoBitsPerSecond: 2000000,
        });
        
        mediaRecorderRef.current.ondataavailable = async ev => {
          console.log('Binary Stream Available', ev.data);

          socket.emit('binarystream', {
            data: ev.data,
            clientId: clientId,
            classId: roomId,
            streamId,
          });
        };

        mediaRecorderRef.current.start(1000);
        setRecording(true);
      } else {
        handleStopRecording();
      }
    }
  };

  const handleStopRecording = () => {
    setShowModal(true);
  };

  const confirmStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.onstop = () => {
        console.log('Recording stopped');
      };

      socket.emit('stopRecording', {
        clientId: roomData.clientId,
        classId: roomData.classId,
      });

      mediaRecorderRef.current = null;
      setRecording(false);
    }
    setShowModal(false);
  };

  const cancelStopRecording = () => {
    setShowModal(false);
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    }
  };

  const toggleMute = () => {
    if (gainNodeRef.current && audioContextRef.current) {
      const newMuteState = !isMuted;
      gainNodeRef.current.gain.setValueAtTime(newMuteState ? 0 : 1, audioContextRef.current.currentTime);
      setIsMuted(newMuteState);
    }
  };

  const toggleCamera = () => {
    if (!recording) {
      setIsFrontCamera(!isFrontCamera);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full bg-gray-900 rounded-lg overflow-hidden" onMouseEnter={() => setShowControls(true)} onMouseLeave={() => setShowControls(false)}>
      <div className="md:aspect-video">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          autoPlay
          playsInline
          muted // Always muted to prevent echo
        ></video>
      </div>

      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 z-10">
          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              <button
                onClick={handleStartRecording}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full ${
                  recording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
                } text-white transition-colors duration-300`}>
                {recording ? <StopCircle size={20} /> : <Record size={20} />}
                <span>{recording ? 'Stop Recording' : 'Start Recording'}</span>
              </button>
              <button
                onClick={toggleCamera}
                disabled={recording}
                className={`p-2 rounded-full ${
                  recording 
                    ? 'bg-gray-500 cursor-not-allowed' 
                    : 'bg-gray-700 hover:bg-gray-600'
                } text-white transition-colors duration-300`}
                title={recording 
                  ? "Cannot switch camera while recording" 
                  : (isFrontCamera ? "Switch to rear camera" : "Switch to front camera")}
              >
                <FlipHorizontal size={20} />
              </button>
            </div>
            <button onClick={handleFullscreen} className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white transition-colors duration-300">
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
              <button className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800 transition-colors duration-300" onClick={cancelStopRecording}>
                Cancel
              </button>
              <button className="px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white transition-colors duration-300" onClick={confirmStopRecording}>
                Stop Recording
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveCamera;