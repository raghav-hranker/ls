export default interface Message {
    userId: string;
    message: string;
    timestamp: number;
    type: "text" | "image" | "pdf"
    content: string
    sender: "user" | "other"
}