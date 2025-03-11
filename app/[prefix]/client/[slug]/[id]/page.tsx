"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
// import DashJsStream from '@/components/DashPlayer'
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

const ClientPage = () => {
  const [roomId, setRoomId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [roomData, setRoomData] = useState<any>(null);
  const [protocol, setProtocol] = useState<string>("");
  const [srcUrl, setSrcUrl] = useState<string>("");
  const [messages, setMessages] = useState<any>([]);
  const [classId, setClassId] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const previousStreamUpdateRef = useRef<string>("");

  const searchParams = useSearchParams();
  const { socket, streamUpdate, fileGenerated} = useSocket(SOCKET_IO_BACKEND_URL);
  console.log(streamUpdate, "streamStatus index.tsx");
  console.log(fileGenerated, "fileGenerated index.tsx");

  useEffect(() => {
    setLoading(true);
    console.log(searchParams.toString());
    const prefix = searchParams.get("prefix");

    // if (prefix && typeof prefix === 'string') {
    // setProtocol(prefix);
    const folder1 = searchParams.get("slug");
    const classId = searchParams.get("id");
    console.log(searchParams, "searchParams");
    // const url = `${LIVESTREAM_LOCAL_URL}/output/${folder1}/bank/${classId}/${classId}.mpd`;
    // console.log(url, "url");
    // setSrcUrl(url);
    const roomId = searchParams.get("roomId");
    const role = searchParams.getAll("role")[0];
    console.log(role, roomId, "params");

    if (classId && typeof classId === "string") {
      setClassId(classId);
    }
    if (role && typeof role === "string") {
      setRole(role);
    }
    if (roomId && typeof roomId === "string") {
      setRoomId(roomId);
    }

    const getRoomData = async () => {
      console.log("fetching");
      const response = await fetch(
        `${LIVESTREAM_BACKEND_URL}/api/v1/room/${roomId}`
      );
      console.log(response, "response");
      const data = await response.json();

      if (data.status === "ended") {
        // const url = `${LIVESTREAM_BACKEND_URL}/output/${folder1}/bank/${classId}/${classId}.mpd`;
        // console.log(url, "url");
        // setSrcUrl(url);
        setSrcUrl(data.vodPath);
      } else if (data.status === "live") {
        // const url = `${LIVESTREAM_BACKEND_URL}/output/${folder1}/bank/${classId}/${classId}.mpd`;
        // console.log(url, "url");
        // setSrcUrl(url);
        setSrcUrl(data.streamPath);
        // setSrcUrl(data.vodPath)
        // setSrcUrl("https://s3.us-east-1.amazonaws.com/tempvideos.hranker.test/processed/5538262-hd_1920_1080_25fps.mp4/output.mpd")
      } else if (data.status === "recorded") {
        setSrcUrl(data.vodPath);
      }
      console.log(data);
      setRoomData(data);
      // if (data.status === 'live' || data.status === 'recorded') {
      setMessages(data.messages);
      // }
      setLoading(false);
      // }
    };
    getRoomData();
  }, [searchParams, streamUpdate, fileGenerated]);

  useEffect(() => {
    if (
      streamUpdate === "live" && 
      previousStreamUpdateRef.current !== "live"
    ) {
      if (role === 'teacher') {
        toast.success('You are live now!', {
          duration: 6000,
          position: 'bottom-right',
        });
      } else {
        toast.info('Class has started - you are now watching live!', {
          duration: 6000,
          position: 'bottom-right',
        });
      }
    }
    
    // Store current status for next comparison
    previousStreamUpdateRef.current = streamUpdate;
  }, [streamUpdate, role]);

  const displayMessages = (currentTime: number) => {
    console.log("called", currentTime);
    console.log(roomData?.messages);
    const normalizedMessages = roomData?.messages.map((msg: any) => ({
      ...msg,
      relativeTime: (msg.timestamp - roomData.startTimestamp) / 1000,
    }));

    console.log(normalizedMessages);

    const filteredMessages = normalizedMessages?.filter(
      (msg: any) => msg.relativeTime <= currentTime
    );
    console.log(filteredMessages);
    setMessages(filteredMessages);
  };

  console.log(role, "role");
  if (roomData?.status === "pending" && role !== "teacher") {
    return (
      <div
        className="pt-4 p-md-6 "
        style={{
          height: "100vh",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <h1 className="">Class will start soon</h1>
      </div>
    );
  }

  if (streamUpdate === "processing" || roomData?.status === "processing") {
    return (
      <div
        className="pt-4 p-md-6 "
        style={{
          height: "100vh",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <h1 className="">
          Class has ended, recording will be uploaded shortly, check back soon
        </h1>
      </div>
    );
  }

  return (
    <>
      <Toaster richColors />
      <div className="flex flex-col lg:flex-row h-screen">
        {role === "teacher" ? (
          <>
            <div className="w-full lg:w-3/4 p-4">
              <LiveCamera
                roomId={roomId}
                classId={classId}
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
            <div className="w-full lg:w-1/4 p-4">
              <Chat messages={messages} roomId={roomId} />
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default ClientPage;