import Message from "./Message";

type RoomStatus = "ended" | "active" | "pending"; // Add more statuses as needed

export default interface Room  {
    _id: string;
    clientId: string;
    courseId: string;
    classId: string;
    roomId: string;
    status: RoomStatus;
    messages: Message[]; 
    __v: number;
    startTimestamp: number;
    streamPath: string;
    endTimestamp: number;
    vodPath: string;
};