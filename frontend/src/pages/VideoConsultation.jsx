import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext.jsx";
import { useVitals } from "../hooks/useVitals.js";
import { VitalsMonitor } from "../components/VitalsMonitor.jsx";
import { RemoteVitals } from "../components/RemoteVitals.jsx";
import "../styles/pages/Consultation.css";

const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];

function VideoTile({ stream, muted = false, label, className = "", videoRef }) {
  const internalRef = useRef(null);
  const resolvedRef = videoRef || internalRef;

  useEffect(() => {
    if (resolvedRef.current && stream) {
      resolvedRef.current.srcObject = stream;
    }
  }, [stream, resolvedRef]);

  return (
    <div className={`video-tile ${className}`}>
      <video ref={resolvedRef} autoPlay playsInline muted={muted} />
      <span className="video-label">{label}</span>
    </div>
  );
}

const VideoConsultation = () => {
  const { roomId, appointmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const activeRoomId = roomId || appointmentId;

  const [seconds, setSeconds] = useState(0);
  const [participantCount, setParticipantCount] = useState(1);
  const [meetingJoined, setMeetingJoined] = useState(false);
  const [connectionState, setConnectionState] = useState("connecting");
  const [roomError, setRoomError] = useState("");
  const [localStream, setLocalStream] = useState(null);
  const [remotePeers, setRemotePeers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isSharingScreen, setIsSharingScreen] = useState(false);

  const [measurementPhase, setMeasurementPhase] = useState(user?.role === "patient" ? "measuring" : "meeting");
  const [preMeetingStream, setPreMeetingStream] = useState(null);
  const [measurementCount, setMeasurementCount] = useState(0);
  
  const [socketInstance, setSocketInstance] = useState(null);
  const [activeVideoElement, setActiveVideoElement] = useState(null);

  const preMeetingVideoRef = useRef(null);
  const localVideoRef = useRef(null);
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const cameraTrackRef = useRef(null);
  const peersRef = useRef({});
  const remoteStreamsRef = useRef({});
  const pendingCandidatesRef = useRef({});
  const hasEndedRef = useRef(false);

  const displayName = useMemo(() => {
    if (!user?.name) return "Participant";
    return user.role === "doctor" ? `Dr. ${user.name}` : user.name;
  }, [user]);

  const primaryPeer = remotePeers[0];
  const primaryStream = primaryPeer?.stream || localStream;
  const primaryLabel = primaryPeer?.name || displayName;

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;
    setSocketInstance(socket);

    return () => {
      socket.disconnect();
    };
  }, []);

  const vitals = useVitals(socketInstance, activeRoomId, activeVideoElement);

  useEffect(() => {
    if (measurementPhase !== "measuring") return;
    
    setActiveVideoElement(preMeetingVideoRef.current);

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setPreMeetingStream(stream);
        if (preMeetingVideoRef.current) {
          preMeetingVideoRef.current.srcObject = stream;
        }
        setTimeout(() => {
          vitals.startVitalsMonitoring();
        }, 1000);
      })
      .catch((err) => {
        console.error("Camera access denied during pre-meeting:", err);
        setMeasurementPhase("meeting");
      });

    return () => {
      vitals.stopVitalsMonitoring();
    };
  }, [measurementPhase, socketInstance]);

  useEffect(() => {
    if (measurementPhase === "measuring" && vitals.heartRate > 0) {
      setMeasurementCount((prev) => {
        const next = prev + 1;
        if (next >= 3) {
          setMeasurementPhase("completed");
          setTimeout(() => {
            setMeasurementPhase("meeting");
          }, 2000);
        }
        return next;
      });
    }
  }, [vitals.heartRate, measurementPhase]);

  useEffect(() => {
    if (measurementPhase === "meeting" && localVideoRef.current) {
      setActiveVideoElement(localVideoRef.current);
    }
  }, [measurementPhase, localStream]);

  useEffect(() => {
    if (!meetingJoined) return undefined;
    const timer = setInterval(() => setSeconds((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [meetingJoined]);

  const formatTime = () => {
    const hrs = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${hrs}:${mins}:${secs}`;
  };

  const markConsultationLive = async () => {
    if (!appointmentId) return;
    try {
      const token = localStorage.getItem("accessToken");
      await API.put(`/appointments/start/${appointmentId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
    } catch (error) {
      console.log(error);
    }
  };

  const markConsultationEnded = async () => {
    if (!appointmentId) return;
    try {
      const token = localStorage.getItem("accessToken");
      await API.put(`/appointments/end/${appointmentId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
    } catch (error) {
      console.log(error);
    }
  };

  const closePeer = (peerId) => {
    const peer = peersRef.current[peerId];
    if (peer) {
      peer.ontrack = null;
      peer.onicecandidate = null;
      peer.onconnectionstatechange = null;
      peer.close();
    }

    delete peersRef.current[peerId];
    delete remoteStreamsRef.current[peerId];
    delete pendingCandidatesRef.current[peerId];
    setRemotePeers((current) => current.filter((remotePeer) => remotePeer.id !== peerId));
  };

  const stopCall = ({ disconnect = true } = {}) => {
    Object.keys(peersRef.current).forEach(closePeer);
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    cameraTrackRef.current = null;
    setLocalStream(null);
    setRemotePeers([]);

    if (socketRef.current?.connected) {
      socketRef.current.emit("video:leave-room");
      if (disconnect) socketRef.current.disconnect();
    }
  };

  useEffect(() => {
    if (measurementPhase !== "meeting" || !socketInstance) return;
    
    let isMounted = true;
    const socket = socketInstance;

    const syncStatus = () => {
      const peers = Object.values(peersRef.current);
      if (peers.length === 0) {
        setConnectionState("waiting");
        return;
      }

      const hasConnectedPeer = peers.some((peer) => peer.connectionState === "connected");
      setConnectionState(hasConnectedPeer ? "connected" : "connecting");
    };

    const joinRoom = () => {
      socket.emit("video:join-room", {
        roomId: activeRoomId,
        userName: displayName,
        userRole: user?.role,
      });
    };

    const upsertRemotePeer = (peerId, stream, name) => {
      setRemotePeers((current) => {
        const existingPeer = current.find((peer) => peer.id === peerId);
        if (existingPeer) {
          return current.map((peer) => (
            peer.id === peerId ? { ...peer, stream, name: name || peer.name } : peer
          ));
        }

        return [...current, { id: peerId, name: name || "Participant", stream }];
      });
    };

    const flushPendingCandidates = async (peerId) => {
      const peer = peersRef.current[peerId];
      const candidates = pendingCandidatesRef.current[peerId] || [];
      if (!peer?.remoteDescription) return;

      while (candidates.length) {
        const candidate = candidates.shift();
        try {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error("Failed to add queued ICE candidate", error);
        }
      }
    };

    const createPeer = (participant, stream) => {
      const peerId = typeof participant === "string" ? participant : participant.id;
      const peerName = typeof participant === "string" ? "Participant" : participant.name;
      if (peersRef.current[peerId]) return peersRef.current[peerId];

      const peer = new RTCPeerConnection({ iceServers });
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("video:ice-candidate", {
            target: peerId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      peer.ontrack = (event) => {
        const incomingStream = event.streams[0] || remoteStreamsRef.current[peerId] || new MediaStream();
        if (!event.streams[0]) incomingStream.addTrack(event.track);
        remoteStreamsRef.current[peerId] = incomingStream;
        upsertRemotePeer(peerId, incomingStream, peerName);
        syncStatus();
      };

      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "failed" || peer.connectionState === "closed") {
          closePeer(peerId);
          return;
        }

        syncStatus();
      };

      peersRef.current[peerId] = peer;
      syncStatus();
      return peer;
    };

    const createOffer = async (participant, stream) => {
      const peerId = typeof participant === "string" ? participant : participant.id;
      const peer = createPeer(participant, stream);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("video:offer", { target: peerId, sdp: offer });
    };

    const setup = async () => {
      try {
        const stream = preMeetingStream || await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!isMounted) {
          if (!preMeetingStream) stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;
        cameraTrackRef.current = stream.getVideoTracks()[0] || null;
        setLocalStream(stream);
        setMeetingJoined(true);
        await markConsultationLive();
        
        if (socket.connected) {
          joinRoom();
        }
      } catch (error) {
        setRoomError(error.message || "Unable to access camera and microphone.");
        setConnectionState("error");
      }
    };

    socket.off("connect");
    socket.off("connect_error");
    socket.off("video:all-users");
    socket.off("video:user-joined");
    socket.off("video:offer");
    socket.off("video:answer");
    socket.off("video:ice-candidate");
    socket.off("video:user-left");
    socket.off("video:participants");
    socket.off("video:room-full");
    socket.off("video:room-error");
    socket.off("video:chat-message");

    socket.on("connect", () => {
      setConnectionState("connected");
      if (localStreamRef.current) joinRoom();
    });

    socket.on("connect_error", (error) => {
      setConnectionState("error");
      setRoomError(error.message);
    });

    socket.on("video:all-users", (participants) => {
      setRoomError("");
      if (!participants.length) setConnectionState("waiting");
      participants.forEach((participant) => createOffer(participant, localStreamRef.current));
    });

    socket.on("video:user-joined", (participant) => {
      if (localStreamRef.current) createPeer(participant, localStreamRef.current);
      setConnectionState("connecting");
    });

    socket.on("video:offer", async ({ caller, sdp }) => {
      const stream = localStreamRef.current;
      if (!stream) return;

      const peer = createPeer(caller, stream);
      await peer.setRemoteDescription(new RTCSessionDescription(sdp));
      await flushPendingCandidates(caller);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("video:answer", { target: caller, sdp: answer });
      setConnectionState("connecting");
    });

    socket.on("video:answer", async ({ caller, sdp }) => {
      const peer = peersRef.current[caller];
      if (!peer || peer.currentRemoteDescription) return;
      await peer.setRemoteDescription(new RTCSessionDescription(sdp));
      await flushPendingCandidates(caller);
    });

    socket.on("video:ice-candidate", async ({ caller, candidate }) => {
      const peer = peersRef.current[caller];
      if (!peer?.remoteDescription) {
        pendingCandidatesRef.current[caller] = [...(pendingCandidatesRef.current[caller] || []), candidate];
        return;
      }

      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on("video:user-left", closePeer);
    socket.on("video:participants", setParticipantCount);
    socket.on("video:room-full", () => setRoomError("This room already has 4 participants."));
    socket.on("video:room-error", setRoomError);
    socket.on("video:chat-message", (message) => {
      setMessages((current) => [...current, { ...message, isSelf: message.sender === socket.id }]);
    });

    setup();
    
    if (user?.role === "patient") {
       setTimeout(() => {
         if (!vitals.isMonitoring) vitals.startVitalsMonitoring();
       }, 2000);
    }

    return () => {
      isMounted = false;
      if (!hasEndedRef.current) {
        hasEndedRef.current = true;
        markConsultationEnded();
      }
      stopCall({ disconnect: false });
    };
  }, [activeRoomId, displayName, user?.role, measurementPhase, socketInstance]);

  const toggleMicrophone = () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const shouldEnable = !stream.getAudioTracks().every((track) => track.enabled);
    stream.getAudioTracks().forEach((track) => {
      track.enabled = shouldEnable;
    });
    setIsMicEnabled(shouldEnable);
  };

  const toggleCamera = () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const shouldEnable = !stream.getVideoTracks().every((track) => track.enabled);
    stream.getVideoTracks().forEach((track) => {
      track.enabled = shouldEnable;
    });
    setIsCameraEnabled(shouldEnable);
  };

  const replaceVideoTrack = (track) => {
    Object.values(peersRef.current).forEach((peer) => {
      const sender = peer.getSenders().find((item) => item.track?.kind === "video");
      sender?.replaceTrack(track);
    });
  };

  const shareScreen = async () => {
    if (isSharingScreen) {
      const cameraTrack = cameraTrackRef.current;
      if (cameraTrack) replaceVideoTrack(cameraTrack);
      setIsSharingScreen(false);
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = displayStream.getVideoTracks()[0];
      replaceVideoTrack(screenTrack);
      setIsSharingScreen(true);

      screenTrack.onended = () => {
        const cameraTrack = cameraTrackRef.current;
        if (cameraTrack) replaceVideoTrack(cameraTrack);
        setIsSharingScreen(false);
      };
    } catch (error) {
      console.log(error);
    }
  };

  const sendMessage = (event) => {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message) return;

    socketRef.current?.emit("video:chat-message", { message });
    setChatInput("");
  };

  const endConsultation = async () => {
    if (!hasEndedRef.current) {
      hasEndedRef.current = true;
      await markConsultationEnded();
    }

    stopCall({ disconnect: true });
    navigate(user?.role === "doctor" ? "/doctor" : "/patient");
  };

  if (measurementPhase === "measuring" || measurementPhase === "completed") {
    return (
      <div className="measurement-overlay" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc', padding: 20 }}>
        <video ref={preMeetingVideoRef} autoPlay playsInline muted style={{ width: 300, height: 300, objectFit: 'cover', borderRadius: '50%', border: '4px solid #2563eb', marginBottom: 20, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', transform: 'scaleX(-1)' }} />
        
        {measurementPhase === "measuring" ? (
          <>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: 10 }}>Measuring your heart rate...</h2>
            <p style={{ color: '#64748b', marginBottom: 20 }}>Please look directly at the camera and stay still.</p>
            <div style={{ width: '100%', maxWidth: 300, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${(measurementCount / 3) * 100}%`, height: '100%', background: '#2563eb', transition: 'width 0.5s ease-out' }} />
            </div>
            {vitals.heartRate > 0 && <p style={{ marginTop: 15, fontSize: '1.25rem', fontWeight: 'bold', color: '#2563eb' }}>{Math.round(vitals.heartRate)} bpm</p>}
          </>
        ) : (
          <>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#22c55e', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', marginBottom: 20 }}>✓</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f172a', marginBottom: 10 }}>Measurement Completed!</h2>
            <p style={{ color: '#64748b' }}>Joining the consultation room...</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="consultation-page">
      <aside className="consultation-sidebar">
        <div className="consultation-brand">
          <h1>🎥 Healix Meet</h1>
          <p>Secure Consultation</p>
        </div>

        <div className="consultation-info">
          <div className="info-row">
            <div className="info-label">Duration</div>
            <div className="info-value">{formatTime()}</div>
          </div>

          <div className="info-row">
            <div className="info-label">Status</div>
            <div className="info-status">
              <span className={`status-dot ${connectionState === 'connected' ? 'live' : connectionState === 'error' ? 'error' : 'waiting'}`} />
              <span>{roomError || (connectionState === 'connected' ? 'Connected' : connectionState === 'waiting' ? 'Waiting for participant' : connectionState)}</span>
            </div>
          </div>
        </div>

        {connectionState !== 'connected' ? (
          <div className="consultation-note">
            <p>Waiting for the other participant to join...</p>
          </div>
        ) : null}

        <form className="consultation-chat" onSubmit={sendMessage}>
          <strong>Room chat</strong>
          <div className="chat-log">
            {messages.length ? messages.map((message) => (
              <div key={message.id} className={`chat-bubble ${message.isSelf ? "self" : ""}`}>
                <span>{message.isSelf ? "You" : message.senderName || "Participant"}</span>
                <p>{message.message}</p>
              </div>
            )) : <p className="empty-chat">No messages yet.</p>}
          </div>
          <div className="chat-compose">
            <input value={chatInput} onChange={(event) => setChatInput(event.target.value)} placeholder="Type a message" />
            <button type="submit">Send</button>
          </div>
        </form>

        <div className="consultation-controls">
          <button className="control-btn mic-btn" onClick={toggleMicrophone} title="Toggle Microphone">
            {isMicEnabled ? "🎤 Mute" : "🔇 Unmute"}
          </button>
          <button className="control-btn camera-btn" onClick={toggleCamera} title="Toggle Camera">
            {isCameraEnabled ? "📹 Camera On" : "📹 Camera Off"}
          </button>
          <button className="control-btn screen-btn" onClick={shareScreen} title="Share Screen">
            {isSharingScreen ? "🛑 Stop Share" : "🖥️ Share"}
          </button>
          <button className="control-btn end" onClick={endConsultation} title="End Consultation">
            ✕ End Call
          </button>
        </div>
      </aside>

      <section className="consultation-stage">
        {roomError ? <div className="call-alert">{roomError}</div> : null}
        <div className="single-video-stage">
          {primaryStream ? (
            <VideoTile stream={primaryStream} muted={!primaryPeer} label={primaryLabel} className="primary-video" videoRef={!primaryPeer ? localVideoRef : undefined} />
          ) : (
            <div className="empty-stage">
              <h2>Waiting for participant</h2>
              <p>Share this consultation link with the patient or doctor to start the call.</p>
            </div>
          )}
        </div>
      </section>

      {user?.role === "patient" && (
        <VitalsMonitor
          isMonitoring={vitals.isMonitoring}
          heartRate={vitals.heartRate}
          respiratoryRate={vitals.respiratoryRate}
          hrv={vitals.hrv}
          onStart={vitals.startVitalsMonitoring}
          onStop={vitals.stopVitalsMonitoring}
          error={vitals.error}
        />
      )}

      {user?.role === "doctor" && (
        <RemoteVitals remoteVitals={vitals.remoteVitals} />
      )}
    </div>
  );
};

export default VideoConsultation;
