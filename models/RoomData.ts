import Message from "./Message";

type RoomStatus = "ended" | "pending" | "processing" | "live" | "recorded"; 

export default interface Room  {
    _id: string;
    clientId: string;
    classId: string;
    roomId: string;
    status: RoomStatus;
    messages: Message[]; 
    startTimestamp: number;
    streamPath: string;
    endTimestamp: number;
    vodPath: string;
};