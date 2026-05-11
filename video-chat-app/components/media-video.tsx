"use client";

import { useEffect, useRef } from "react";

type MediaVideoProps = {
  stream: MediaStream | null;
  muted?: boolean;
  className?: string;
  "data-test-id"?: string;
};

export function MediaVideo({
  stream,
  muted = false,
  className,
  "data-test-id": dataTestId,
}: MediaVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      data-test-id={dataTestId}
      className={className}
    />
  );
}
