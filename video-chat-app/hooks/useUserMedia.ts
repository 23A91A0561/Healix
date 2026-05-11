"use client";

import { useEffect, useState } from "react";

type UserMediaState = {
  stream: MediaStream | null;
  error: string | null;
  isLoading: boolean;
};

export const useUserMedia = (): UserMediaState => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let activeStream: MediaStream | null = null;

    const initMedia = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        activeStream = mediaStream;

        if (!isMounted) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        setStream(mediaStream);
        setError(null);
        setIsLoading(false);

        (
          window as Window & {
            __localStream?: MediaStream | null;
          }
        ).__localStream = mediaStream;
      } catch (mediaError) {
        if (!isMounted) {
          return;
        }

        setError("Camera or microphone access was denied.");
        setIsLoading(false);
        console.error("Error accessing media devices:", mediaError);
      }
    };

    initMedia();

    return () => {
      isMounted = false;

      activeStream?.getTracks().forEach((track) => track.stop());

      (
        window as Window & {
          __localStream?: MediaStream | null;
        }
      ).__localStream = null;
    };
  }, []);

  return {
    stream,
    error,
    isLoading,
  };
};
