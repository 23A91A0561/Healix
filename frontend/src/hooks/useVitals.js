import { useEffect, useRef, useState, useCallback } from "react";

export const useVitals = (socket, roomId, videoElement) => {
  const [vitalsState, setVitalsState] = useState({
    isMonitoring: false,
    heartRate: null,
    respiratoryRate: null,
    hrv: null,
    readings: [],
    error: null,
    remoteVitals: {},
  });

  const vitalLensRef = useRef(null);
  const lastSendTimeRef = useRef(0);
  
  // Keep refs for callbacks
  const socketRef = useRef(socket);
  const roomIdRef = useRef(roomId);

  useEffect(() => {
    socketRef.current = socket;
    roomIdRef.current = roomId;
  }, [socket, roomId]);

  const handleVitals = useCallback((data) => {
    try {
      if (!data) return;
      // Handle different possible payload structures from vitallens.js
      const vitalsData = data.vitals || data;
      
      const hr = vitalsData.heart_rate?.value ?? vitalsData.heartRate?.value ?? vitalsData.heartRate ?? vitalsData.heart_rate;
      const rr = vitalsData.respiratory_rate?.value ?? vitalsData.respiratoryRate?.value ?? vitalsData.respiratoryRate ?? vitalsData.respiratory_rate;
      const hrv = vitalsData.hrv?.value ?? vitalsData.hrv;

      // Only update if we have a valid heart rate to prevent "0" readings
      if (!hr) {
        console.log("Vitals processing... waiting for valid heart rate");
        return;
      }
      
      const newReading = {
        heartRate: hr,
        respiratoryRate: rr,
        hrv: hrv,
        timestamp: Date.now(),
      };
      
      console.log("Received valid vitals!", newReading);

      setVitalsState((prev) => ({
        ...prev,
        heartRate: newReading.heartRate || prev.heartRate,
        respiratoryRate: newReading.respiratoryRate || prev.respiratoryRate,
        hrv: newReading.hrv || prev.hrv,
        readings: [...prev.readings.slice(-99), newReading], // Keep last 100 readings
      }));

      // Broadcast vitals to other participants
      const now = Date.now();
      if (now - lastSendTimeRef.current > 1000 && socketRef.current) {
        socketRef.current.emit("vital-data", {
          roomId: roomIdRef.current,
          vitals: newReading,
        });
        lastSendTimeRef.current = now;
      }
    } catch (err) {
      console.error("Error parsing vitals data:", err);
    }
  }, []);

  const initializeVitalLens = useCallback(async () => {
    try {
      if (vitalLensRef.current) return true;
      
      const { VitalLens } = await import("../libs/vitallens-shim.js");

      vitalLensRef.current = new VitalLens({
        method: "local",
        apiKey: "local",
      });
      
      vitalLensRef.current.addEventListener("vitals", handleVitals);

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
  }, [handleVitals]);

  const startVitalsMonitoring = useCallback(async () => {
    if (!videoElement) {
      setVitalsState((prev) => ({
        ...prev,
        error: "Video element not available",
      }));
      return;
    }

    try {
      const initialized = await initializeVitalLens();
      if (!initialized) return;

      console.log("Starting vitals monitoring on video element...");
      await vitalLensRef.current.setVideoStream(videoElement.srcObject, videoElement);
      vitalLensRef.current.startVideoStream();

      setVitalsState((prev) => ({
        ...prev,
        isMonitoring: true,
        error: null,
      }));

    } catch (error) {
      console.error("Error starting vitals monitoring:", error);
      setVitalsState((prev) => ({
        ...prev,
        error: "Failed to start vital signs monitoring",
      }));
    }
  }, [videoElement, initializeVitalLens]);

  const stopVitalsMonitoring = useCallback(() => {
    if (vitalLensRef.current) {
      vitalLensRef.current.stopVideoStream();
    }

    setVitalsState((prev) => ({
      ...prev,
      isMonitoring: false,
    }));

    // Notify server to stop monitoring
    if (socketRef.current) {
      socketRef.current.emit("close-vitals", { roomId: roomIdRef.current });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVitalsMonitoring();
      if (vitalLensRef.current) {
        vitalLensRef.current.removeEventListener("vitals");
        vitalLensRef.current.close().catch(console.error);
        vitalLensRef.current = null;
      }
    };
  }, [stopVitalsMonitoring]);

  // Listen for vitals data from other participants
  useEffect(() => {
    if (!socket) return;

    const handleVitalUpdate = (data) => {
      const { socketId, vitals, timestamp } = data || {};
      if (!socketId || !vitals) return;

      const reading = {
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
    };

    const handleRoomVitals = (data) => {
      if (!data) return;
      setVitalsState((prev) => ({
        ...prev,
        remoteVitals: {
          ...prev.remoteVitals,
          ...data,
        },
      }));
    };

    const handleMonitoringStopped = () => {
      console.log("Vitals monitoring stopped by remote");
    };

    socket.on("vital-data-update", handleVitalUpdate);
    socket.on("vitals-data", handleRoomVitals);
    socket.on("vitals-monitoring-stopped", handleMonitoringStopped);

    return () => {
      socket.off("vital-data-update", handleVitalUpdate);
      socket.off("vitals-data", handleRoomVitals);
      socket.off("vitals-monitoring-stopped", handleMonitoringStopped);
    };
  }, [socket]);

  return {
    ...vitalsState,
    startVitalsMonitoring,
    stopVitalsMonitoring,
  };
};
