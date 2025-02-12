import router from "next/router";
import io  from "socket.io-client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const useSocket = (socketUrl: string) => {

    const [socket, setSocket] = useState<any>();
    const [streamUpdate, setStreamUpdate] = useState<string>('');
    const [fileGenerated, setFileGenerated] = useState<boolean>(false);
    const router = useRouter()
    useEffect(() => {
        if (router) {
            setSocket(io(socketUrl, {
                "transports": ["websocket"],
            }));
        }
        return () => { };
    }, [router]);
    const searchParams = useSearchParams();
    useEffect(() => {
        const roomId = searchParams.get('roomId');
        if (socket) {
            socket.emit('joinRoom', roomId);
            
            socket.on('streamUpdate', (data: any) => {
                console.log('streamUpdate:', data);
                setStreamUpdate(data);
            });

            socket.on('fileGenerated', (data: any) => {
                console.log('fileGenerated:', data);
                setFileGenerated(data);  
            });
        }

    }, [socket])
    return { socket, streamUpdate, fileGenerated };
}

export default useSocket;