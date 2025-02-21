export default interface Message {
    roomId: string
    userId: string;
    message: string;
    timestamp: number;
    type: "text" | "image" | "pdf" | "audio";
    content: string;
    sender: "user" | "other";
    fileName: string;
}