import io from "socket.io-client";
import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";

const useSocket = (socketUrl: string) => {
    const [socket, setSocket] = useState<any>(null);
    const [streamUpdate, setStreamUpdate] = useState<string>('');
    const [fileGenerated, setFileGenerated] = useState<boolean>(false);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const socketRef = useRef<any>(null);
    const roomIdRef = useRef<string | null>(null);

    const params = useParams();
    const roomId = params?.roomId as string;

    useEffect(() => {
        const socketInstance = io(socketUrl, {
            transports: ["websocket"],
            reconnection: true,          
            reconnectionAttempts: 10,    
            reconnectionDelay: 1000,     
            reconnectionDelayMax: 5000,  
            timeout: 20000,              
            autoConnect: true            
        });

        socketRef.current = socketInstance;
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
    }, [socketUrl]); 

    useEffect(() => {
        if (!socketRef.current || !isConnected || !roomId) return;

        console.log('Setting up room with ID:', roomId);
        roomIdRef.current = roomId;
        
        socketRef.current.emit('joinRoom', roomId);
        console.log('Joined room:', roomId);
        
        const handleStreamUpdate = (data: any) => {
            console.log('streamUpdate:', data);
            setStreamUpdate(data);
        };

        const handleFileGenerated = (data: any) => {
            console.log('fileGenerated:', data);
            setFileGenerated(data);
        };
        
        socketRef.current.on('streamUpdate', handleStreamUpdate);
        socketRef.current.on('fileGenerated', handleFileGenerated);

        return () => {
            if (socketRef.current) {
                socketRef.current.off('streamUpdate', handleStreamUpdate);
                socketRef.current.off('fileGenerated', handleFileGenerated);
            }
        };
    }, [isConnected, roomId]); 

    useEffect(() => {
        if (!socketRef.current || !isConnected) return;

        const pingInterval = setInterval(() => {
            socketRef.current.emit('ping');
            console.log('Ping sent to keep connection alive');
        }, 30000);

        return () => clearInterval(pingInterval);
    }, [isConnected]);

    const reconnect = () => {
        if (socketRef.current) {
            console.log('Manually reconnecting socket...');
            socketRef.current.connect();
        }
    };

    return { 
        socket: socketRef.current, 
        streamUpdate, 
        fileGenerated, 
        isConnected,
        reconnect 
    };
};

export default useSocket;