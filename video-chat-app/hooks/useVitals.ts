import { useEffect, useRef, useState, useCallback } from "react";

interface VitalReading {
  heartRate?: number;
  respiratoryRate?: number;
  hrv?: number;
  timestamp: number;
}

interface VitalsState {
  isMonitoring: boolean;
  heartRate: number | null;
  respiratoryRate: number | null;
  hrv: number | null;
  readings: VitalReading[];
  error: string | null;
  remoteVitals: Record<string, VitalReading | undefined>;
}

export const useVitals = (socket: any, roomId: string, videoElement: HTMLVideoElement | null) => {
  const [vitalsState, setVitalsState] = useState<VitalsState>({
    isMonitoring: false,
    heartRate: null,
    respiratoryRate: null,
    hrv: null,
    readings: [],
    error: null,
    remoteVitals: {},
  });

  const vitalLensRef = useRef<any>(null);
  const processingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSendTimeRef = useRef<number>(0);

  const initializeVitalLens = useCallback(async () => {
    try {
      // Dynamically import VitalLens
      const { VitalLens } = await import("vitallens");

      vitalLensRef.current = new VitalLens({
        method: "vitallens", // Use local method or API method
        apiKey: process.env.NEXT_PUBLIC_VITALLENS_API_KEY || "local",
      });

      console.log("VitalLens initialized successfully");
      return true;
    } catch (error) {
      console.error("Error initializing VitalLens:", error);
      setVitalsState((prev) => ({
        ...prev,
        error: "Failed to initialize vital signs monitoring",
      }));
      return false;
    }
  }, []);

  const startVitalsMonitoring = useCallback(async () => {
    if (!videoElement || !socket) {
      setVitalsState((prev) => ({
        ...prev,
        error: "Video element or socket not available",
      }));
      return;
    }

    try {
      const initialized = await initializeVitalLens();
      if (!initialized) return;

      setVitalsState((prev) => ({
        ...prev,
        isMonitoring: true,
        error: null,
      }));

      // Process video frames at intervals (every 2 seconds)
      processingIntervalRef.current = setInterval(async () => {
        try {
          if (!vitalLensRef.current || !videoElement) return;

          // Extract frame from video element
          const canvas = document.createElement("canvas");
          canvas.width = videoElement.videoWidth;
          canvas.height = videoElement.videoHeight;
          const ctx = canvas.getContext("2d");

          if (!ctx) return;

          ctx.drawImage(videoElement, 0, 0);
          const frameData = canvas.toDataURL("image/jpeg");

          // Process with VitalLens
          const result = await vitalLensRef.current.processVideoFrame({
            frame: frameData,
          });

          if (result && result.vitals) {
            const newReading: VitalReading = {
              heartRate: result.vitals.heart_rate?.value,
              respiratoryRate: result.vitals.respiratory_rate?.value,
              hrv: result.vitals.hrv?.value,
              timestamp: Date.now(),
            };

            setVitalsState((prev) => ({
              ...prev,
              heartRate: newReading.heartRate || prev.heartRate,
              respiratoryRate: newReading.respiratoryRate || prev.respiratoryRate,
              hrv: newReading.hrv || prev.hrv,
              readings: [...prev.readings.slice(-99), newReading], // Keep last 100 readings
            }));

            // Broadcast vitals to other participants
            const now = Date.now();
            if (now - lastSendTimeRef.current > 1000) {
              // Send every 1 second
              socket.emit("vital-data", {
                roomId,
                vitals: newReading,
              });
              lastSendTimeRef.current = now;
            }
          }
        } catch (error) {
          console.error("Error processing vital signs:", error);
        }
      }, 2000);
    } catch (error) {
      console.error("Error starting vitals monitoring:", error);
      setVitalsState((prev) => ({
        ...prev,
        error: "Failed to start vital signs monitoring",
      }));
    }
  }, [videoElement, socket, roomId, initializeVitalLens]);

  const stopVitalsMonitoring = useCallback(() => {
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }

    setVitalsState((prev) => ({
      ...prev,
      isMonitoring: false,
    }));

    // Notify server to stop monitoring
    if (socket) {
      socket.emit("close-vitals", { roomId });
    }
  }, [socket, roomId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVitalsMonitoring();
    };
  }, [stopVitalsMonitoring]);

  // Listen for vitals data from other participants
  useEffect(() => {
    if (!socket) return;

    socket.on("vital-data-update", (data: any) => {
      // data: { socketId, vitals, timestamp }
      const { socketId, vitals, timestamp } = data || {};
      if (!socketId || !vitals) return;

      const reading: VitalReading = {
        heartRate: vitals.heartRate ?? vitals.heart_rate ?? null,
        respiratoryRate: vitals.respiratoryRate ?? vitals.respiratory_rate ?? null,
        hrv: vitals.hrv ?? null,
        timestamp: timestamp || Date.now(),
      };

      setVitalsState((prev) => ({
        ...prev,
        remoteVitals: {
          ...prev.remoteVitals,
          [socketId]: reading,
        },
      }));
    });

    socket.on("vitals-data", (data: any) => {
      // data is an object keyed by socketId
      if (!data) return;
      setVitalsState((prev) => ({
        ...prev,
        remoteVitals: {
          ...prev.remoteVitals,
          ...data,
        },
      }));
    });

    socket.on("vitals-monitoring-stopped", () => {
      console.log("Vitals monitoring stopped");
      stopVitalsMonitoring();
    });

    return () => {
      socket.off("vital-data-update");
      socket.off("vitals-data");
      socket.off("vitals-monitoring-stopped");
    };
  }, [socket, stopVitalsMonitoring]);

  return {
    ...vitalsState,
    startVitalsMonitoring,
    stopVitalsMonitoring,
    isMonitoring: vitalsState.isMonitoring,
  };
};
