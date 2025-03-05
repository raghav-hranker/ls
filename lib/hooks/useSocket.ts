import io from "socket.io-client";
import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const useSocket = (socketUrl: string) => {
    const [socket, setSocket] = useState<any>(null);
    const [streamUpdate, setStreamUpdate] = useState<string>('');
    const [fileGenerated, setFileGenerated] = useState<boolean>(false);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const router = useRouter();
    const roomIdRef = useRef<string | null>(null);
    const searchParams = useSearchParams();

    useEffect(() => {
        if (!router) return;

        const socketInstance = io(socketUrl, {
            transports: ["websocket"],
            reconnection: true,          
            reconnectionAttempts: 10,    
            reconnectionDelay: 1000,     
            reconnectionDelayMax: 5000,  
            timeout: 20000,              
            autoConnect: true            
        });

        setSocket(socketInstance);

        socketInstance.on('connect', () => {
            console.log('Socket connected');
            setIsConnected(true);
            
            if (roomIdRef.current) {
                socketInstance.emit('joinRoom', roomIdRef.current);
                console.log('Rejoined room:', roomIdRef.current);
            }
        });

        socketInstance.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
            setIsConnected(false);
        });

        socketInstance.on('reconnect', (attemptNumber) => {
            console.log('Socket reconnected after', attemptNumber, 'attempts');
        });

        socketInstance.on('reconnect_attempt', (attemptNumber) => {
            console.log('Socket reconnection attempt:', attemptNumber);
        });

        socketInstance.on('reconnect_error', (error) => {
            console.error('Socket reconnection error:', error);
        });

        socketInstance.on('reconnect_failed', () => {
            console.error('Socket reconnection failed');
        });

        return () => {
            socketInstance.disconnect();
            socketInstance.removeAllListeners();
        };
    }, [router, socketUrl]);

    useEffect(() => {
        if (!socket || !isConnected) return;

        const roomId = searchParams.get('roomId');
        roomIdRef.current = roomId; 

        if (roomId) {
            socket.emit('joinRoom', roomId);
            console.log('Joined room:', roomId);
            
            socket.on('streamUpdate', (data: any) => {
                console.log('streamUpdate:', data);
                setStreamUpdate(data);
            });

            socket.on('fileGenerated', (data: any) => {
                console.log('fileGenerated:', data);
                setFileGenerated(data);  
            });
        }

        const pingInterval = setInterval(() => {
            if (socket && isConnected) {
                socket.emit('ping');
                console.log('Ping sent to keep connection alive');
            }
        }, 30000); 

        return () => {
            clearInterval(pingInterval);
            if (socket) {
                socket.off('streamUpdate');
                socket.off('fileGenerated');
            }
        };
    }, [socket, isConnected, searchParams]);

    const reconnect = () => {
        if (socket) {
            console.log('Manually reconnecting socket...');
            socket.connect();
        }
    };

    return { 
        socket, 
        streamUpdate, 
        fileGenerated, 
        isConnected,
        reconnect 
    };
};

export default useSocket;