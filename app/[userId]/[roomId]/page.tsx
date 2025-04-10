"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LIVESTREAM_LOCAL_URL,
  LIVESTREAM_BACKEND_URL,
  SOCKET_IO_LOCAL_URL,
  SOCKET_IO_BACKEND_URL,
} from "@/config/BaseConstants";
import useSocket from "@/lib/hooks/useSocket";
import LiveCamera from "@/components/LiveCamera";
import VideoPlayer from "@/components/VideoPlayer";
import Chat from "@/components/Chat";
import HLSVideoPlayer from "@/components/HLSVideoPlayer";
import { Toaster, toast } from "sonner";
import { useParams } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { Rating } from "@/components/Rating";
import ClassRating from "@/components/ClassRating";

interface DecodedToken {
  user_id: string | null;
  class_id: string;
  role: string;
  exp: number;
}

const ClientPage = () => {
  const [roomId, setRoomId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [roomData, setRoomData] = useState<any>(null);
  const [protocol, setProtocol] = useState<string>("");
  const [srcUrl, setSrcUrl] = useState<string>("");
  const [messages, setMessages] = useState<any[]>([]);
  const [classId, setClassId] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [creatingRoom, setCreatingRoom] = useState<boolean>(false);
  const previousStreamUpdateRef = useRef<string>("");
  const params = useParams();
  const router = useRouter();

  const searchParams = useSearchParams();
  const { socket, streamUpdate, fileGenerated } = useSocket(
    SOCKET_IO_BACKEND_URL
  );
  console.log(streamUpdate, "streamStatus index.tsx");
  console.log(fileGenerated, "fileGenerated index.tsx");

  useEffect(() => {
    console.log(searchParams.toString());

    const roomIdParam = params.roomId as string;
    const clientIdParam = params.userId as string;
    let roleParam = searchParams.get("role");
    const token = searchParams.get("token");

    if (token) {
      const decoded = jwtDecode<DecodedToken>(token);
      console.log(decoded, "decoded");
      roleParam = decoded.role;
    }

    console.log(roleParam, roomIdParam, "params");

    if (roomIdParam && typeof roomIdParam === "string") {
      setClassId(roomIdParam);
      setRoomId(roomIdParam);
    }

    if (clientIdParam && typeof clientIdParam === "string") {
      setClientId(clientIdParam);
    }

    if (roleParam && typeof roleParam === "string") {
      setRole(roleParam);
    }

    const getRoomData = async () => {
      try {
        console.log("fetching");
        const response = await fetch(
          `${LIVESTREAM_BACKEND_URL}/api/v1/room/${roomIdParam}`
        );
        console.log(response, "response");

        if (!response.ok) {
          if (response.status === 404) {
            setCreatingRoom(true);
            const newRoomData = await createRoom(clientIdParam, roomIdParam);
            if (newRoomData) {
              setRoomData(newRoomData);
              setLoading(false);
              setCreatingRoom(false);
              return;
            }
          }
          throw new Error("Failed to fetch room data");
        }

        const data = await response.json();

        if (data.status === "ended") {
          setSrcUrl(data.vodPath || "");
        } else if (data.status === "live") {
          setSrcUrl(data.streamPath || "");
        } else if (data.status === "recorded") {
          setSrcUrl(data.vodPath || "");
        }
        console.log(data);
        setRoomData(data);
        if (
          data.status === "live" ||
          data.status === "recorded" ||
          data.status === "ended"
        ) {
          setMessages(Array.isArray(data.messages) ? data.messages : []);
        }
      } catch (error) {
        console.error("Error fetching room data:", error);
        toast.error("Failed to load room data");
      } finally {
        setLoading(false);
      }
    };

    getRoomData();
  }, [searchParams, streamUpdate, fileGenerated]);

  const createRoom = async (clientId: string, roomId: string) => {
    try {
      setCreatingRoom(true);
      const API_URL = `${LIVESTREAM_BACKEND_URL}/api/v1/room`;
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: clientId,
          classId: roomId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create room");
      }

      const data = await response.json();
      toast.success("Room created successfully!", {
        duration: 4000,
        position: "bottom-right",
      });

      const newRoomData = {
        ...data.room,
      };

      return newRoomData;
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error("Failed to create room. Please try again.");
      return null;
    }
  };

  useEffect(() => {
    if (streamUpdate === "live" && previousStreamUpdateRef.current !== "live") {
      if (role === "teacher") {
        toast.success("You are live now!", {
          duration: 6000,
          position: "bottom-right",
        });
      } else {
        toast.info("Class has started - you are now watching live!", {
          duration: 6000,
          position: "bottom-right",
        });
      }
    }

    previousStreamUpdateRef.current = streamUpdate || "";
  }, [streamUpdate, role]);

  const displayMessages = (currentTime: number): void => {
    if (!roomData || !roomData.messages || !Array.isArray(roomData.messages)) {
      return;
    }

    console.log("called", currentTime);
    console.log(roomData.messages);

    const normalizedMessages = roomData.messages.map((msg: any) => ({
      ...msg,
      relativeTime: (msg.timestamp - (roomData.startTimestamp || 0)) / 1000,
    }));

    console.log(normalizedMessages);

    const filteredMessages = normalizedMessages.filter(
      (msg: any) => msg.relativeTime <= currentTime
    );
    console.log(filteredMessages);
    setMessages(filteredMessages);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold">Loading...</h2>
        </div>
      </div>
    );
  }

  if (creatingRoom) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold mb-2">Creating Your Room</h2>
          <p className="text-gray-600 mb-4">
            The room doesn't exist yet, so we're setting it up for you. This
            will only take a moment...
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-blue-500 h-2.5 rounded-full animate-pulse w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (roomData?.status === "pending" && role !== "teacher") {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <svg
            className="w-16 h-16 text-blue-500 mx-auto mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-2xl font-bold mb-2">Class Will Start Soon</h2>
          <p className="text-gray-600 mb-6">
            The teacher hasn't started the class yet. Please wait for the
            teacher to go live.
          </p>

          <p className="text-sm text-gray-500">
            This page will automatically update when the class begins.
          </p>
        </div>
      </div>
    );
  }

  if (streamUpdate === "processing" || roomData?.status === "processing") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-2">Processing Recording</h2>
          <p className="text-gray-600 mb-4">
            The class has ended and the recording is now being processed. It
            will be available shortly.
          </p>
          <p className="text-sm text-gray-500">
            Please check back soon. This page will refresh automatically when
            the recording is ready.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster richColors />
      <div className="flex flex-col lg:flex-row min-h-screen">
        {role === "teacher" && roomData?.status !== "ended" ? (
          <>
            <div className="w-full lg:w-3/4 p-4">
              <LiveCamera
                roomId={roomId}
                classId={classId}
                clientId={clientId}
                roomData={roomData}
                messages={messages}
              />
            </div>
            <div className="w-full lg:w-1/4 p-4">
              <Chat messages={messages} roomId={roomId} />
            </div>
          </>
        ) : (
          <>
            <div className="w-full lg:w-3/4 p-4">
              <HLSVideoPlayer
                srcUrl={srcUrl}
                status={roomData?.status}
                roomId={roomId}
                streamStatus={streamUpdate}
                fileGenerated={fileGenerated}
                autoplay={true}
              />
            </div>
            <div className="w-full lg:w-1/4 p-4 overflow-y-auto h-screen">
              <Chat messages={messages} roomId={roomId} />
              {/* <div className="mt-2 pb-5">
                <ClassRating classId={classId} className="" />
              </div> */}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default ClientPage;
