"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

export type SocketConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export const useSocket = () => {
  const [socket] = useState<Socket>(() =>
    io({
      path: '/socket.io',
      transports: ["websocket"],
      reconnection: true,
    })
  );
  const [connectionState, setConnectionState] =
    useState<SocketConnectionState>("connecting");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    socket.on("connect", () => {
      setConnectionState("connected");
      setError(null);
    });

    socket.on("disconnect", () => {
      setConnectionState("disconnected");
    });

    socket.on("connect_error", (connectError) => {
      setConnectionState("error");
      setError(connectError.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [socket]);

  return {
    socket,
    connectionState,
    error,
  };
};
