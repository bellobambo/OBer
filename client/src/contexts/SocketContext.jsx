import { createContext, useContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  // Optional flag if we want a global demo mode
  const [isDemoMode, setIsDemoMode] = useState(() => {
    return localStorage.getItem("ober_demo_mode") !== "false";
  });

  // Persist demo mode
  useEffect(() => {
    localStorage.setItem("ober_demo_mode", isDemoMode);
  }, [isDemoMode]);

  useEffect(() => {
    // Only connect to socket if we are NOT in demo mode
    if (isDemoMode) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    const API_URL = import.meta.env.VITE_API_URL || "https://ober-2c8e.onrender.com";

    const newSocket = io(API_URL, {
      auth: { token },
      transports: ["websocket"], // prefer websocket
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
      console.log("Socket connected:", newSocket.id);
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
      console.log("Socket disconnected");
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isDemoMode]); // Reconnect when demo mode toggles (if they have token)

  return (
    <SocketContext.Provider value={{ socket, isConnected, isDemoMode, setIsDemoMode }}>
      {children}
    </SocketContext.Provider>
  );
}
