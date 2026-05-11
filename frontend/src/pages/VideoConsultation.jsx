import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { io } from "socket.io-client";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext.jsx";
import PrescriptionPanel from "../components/PrescriptionPanel.jsx";

import "../styles/pages/Consultation.css";

const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
const VITALS_SERVICE_URL = import.meta.env.VITE_RPPG_URL || "http://localhost:5001";

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
  const [isPrescriptionOpen, setIsPrescriptionOpen] = useState(false);
  const [measurementPhase, setMeasurementPhase] = useState("pre-consultation");
  const [vitalsState, setVitalsState] = useState({
    status: "Initializing...",
    bpm: 0, rr: 0, sbp: 0, dbp: 0, stress_level: "-", remaining_seconds: 15, measurement_complete: false
  });
  const [vitalsServiceError, setVitalsServiceError] = useState("");

  const [socketInstance, setSocketInstance] = useState(null);

  useEffect(() => {
    if (measurementPhase !== "pre-consultation") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${VITALS_SERVICE_URL}/vitals_data`, { cache: "no-store" });
        if (!res.ok) throw new Error(`rPPG service responded ${res.status}`);
        const data = await res.json();
        setVitalsState(data);
        setVitalsServiceError("");
      } catch (err) {
        console.error("Failed to fetch vitals", err);
        setVitalsServiceError("rPPG service is not reachable. Start the app with npm run dev and allow camera access.");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [measurementPhase]);

  useEffect(() => {
    if (user && user.role === "doctor") {
      setMeasurementPhase("meeting");
    }
  }, [user]);

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

  // Removed vitals related hooks and effects

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

      if (vitalsState.measurement_complete) {
        socket.emit("vital-data", { roomId: activeRoomId, vitals: vitalsState });
      }
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
        await new Promise((resolve) => setTimeout(resolve, 500));
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 640 },
              height: { ideal: 480 },
              frameRate: { ideal: 15, max: 30 },
            },
            audio: true,
          });
        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
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

      if (vitalsState.measurement_complete) {
        socket.emit("vital-data", { roomId: activeRoomId, vitals: vitalsState });
      }
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
    
    socket.on("vital-data-update", (data) => {
      setVitalsState(data.vitals);
    });

    setup();

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

  const handleContinueToMeeting = async () => {
    try {
      await fetch(`${VITALS_SERVICE_URL}/stop_camera`);
    } catch (e) {
      console.log("Failed to stop camera API", e);
    }
    setMeasurementPhase("meeting");
  };



  return (
    <div className={`consultation-page ${isPrescriptionOpen ? 'with-prescription' : ''}`}>
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

          {vitalsState.measurement_complete && measurementPhase === "meeting" && (
            <div className="vitals-summary" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#2a2a35', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '14px', color: '#00E676', marginBottom: '10px' }}>Patient Vitals</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                <div style={{ padding: '8px', backgroundColor: '#1e1e24', borderRadius: '4px' }}>
                  <span style={{ color: '#aaa', display: 'block' }}>HR (bpm)</span>
                  <strong style={{ color: '#ff5252', fontSize: '16px' }}>{vitalsState.bpm}</strong>
                </div>
                <div style={{ padding: '8px', backgroundColor: '#1e1e24', borderRadius: '4px' }}>
                  <span style={{ color: '#aaa', display: 'block' }}>Resp Rate</span>
                  <strong style={{ color: '#448aff', fontSize: '16px' }}>{vitalsState.rr}</strong>
                </div>
                <div style={{ padding: '8px', backgroundColor: '#1e1e24', borderRadius: '4px' }}>
                  <span style={{ color: '#aaa', display: 'block' }}>Blood Press.</span>
                  <strong style={{ color: '#69f0ae', fontSize: '16px' }}>{vitalsState.sbp}/{vitalsState.dbp}</strong>
                </div>
                <div style={{ padding: '8px', backgroundColor: '#1e1e24', borderRadius: '4px' }}>
                  <span style={{ color: '#aaa', display: 'block' }}>Stress</span>
                  <strong style={{ color: '#ffd740', fontSize: '16px' }}>{vitalsState.stress_level}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {connectionState !== 'connected' ? (
          <div className="consultation-note">
            <p>Waiting for the other participant to join...</p>
          </div>
        ) : null}

        {user?.role === 'doctor' && (
          <div style={{ marginTop: 16 }}>
            <button onClick={() => setIsPrescriptionOpen(!isPrescriptionOpen)} className="btn btn-primary w-full">
              {isPrescriptionOpen ? 'Close Prescription' : 'Create Prescription'}
            </button>
          </div>
        )}

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
        {measurementPhase === "pre-consultation" ? (
          <div className="pre-consultation-stage" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%', backgroundColor: '#1e1e24', color: 'white', borderRadius: '12px' }}>
            <h2 style={{ marginBottom: '10px', color: '#00E676' }}>Pre-Consultation Vitals Check</h2>
            <p style={{ marginBottom: '20px', fontSize: '18px', color: vitalsServiceError ? '#ff8a80' : '#ccc', textAlign: 'center', maxWidth: '620px' }}>
              {vitalsServiceError || vitalsState.status} {(!vitalsServiceError && !vitalsState.measurement_complete && vitalsState.remaining_seconds < 15) ? `(${vitalsState.remaining_seconds}s remaining)` : ""}
            </p>
            
            <div className="video-container" style={{ border: '4px solid transparent', borderRadius: '50%', overflow: 'hidden', boxShadow: 'none', backgroundColor: '#000', marginBottom: '30px', width: '300px', height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {vitalsServiceError ? (
                <div style={{ color: '#ff8a80', fontSize: '14px', padding: '24px', textAlign: 'center' }}>Camera preview unavailable</div>
              ) : (
                <img
                  src={`${VITALS_SERVICE_URL}/video_feed`}
                  alt="Pre-consultation vitals scanner"
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                  onError={() => setVitalsServiceError("Camera preview failed. Check that the rPPG service is running on port 5001.")}
                  onLoad={() => setVitalsServiceError("")}
                />
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px', textAlign: 'center', width: '80%', maxWidth: '500px' }}>
              <div style={{ backgroundColor: '#2a2a35', padding: '15px', borderRadius: '8px' }}>
                <div style={{ fontSize: '14px', color: '#aaa' }}>Heart Rate</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff5252' }}>{vitalsState.bpm || "--"} <span style={{fontSize: '14px', fontWeight: 'normal'}}>BPM</span></div>
              </div>
              <div style={{ backgroundColor: '#2a2a35', padding: '15px', borderRadius: '8px' }}>
                <div style={{ fontSize: '14px', color: '#aaa' }}>Respiratory Rate</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#448aff' }}>{vitalsState.rr || "--"} <span style={{fontSize: '14px', fontWeight: 'normal'}}>bpm</span></div>
              </div>
              <div style={{ backgroundColor: '#2a2a35', padding: '15px', borderRadius: '8px' }}>
                <div style={{ fontSize: '14px', color: '#aaa' }}>Blood Pressure</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#69f0ae' }}>{vitalsState.sbp || "--"}/{vitalsState.dbp || "--"} <span style={{fontSize: '14px', fontWeight: 'normal'}}>mmHg</span></div>
              </div>
              <div style={{ backgroundColor: '#2a2a35', padding: '15px', borderRadius: '8px' }}>
                <div style={{ fontSize: '14px', color: '#aaa' }}>Stress Level</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffd740' }}>{vitalsState.stress_level || "-"}</div>
              </div>
            </div>

            <button 
              onClick={handleContinueToMeeting}
              style={{ padding: '12px 24px', fontSize: '16px', backgroundColor: '#00E676', color: '#121212', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'background-color 0.2s', opacity: vitalsState.measurement_complete ? 1 : 0.5 }}
              onMouseOver={(e) => vitalsState.measurement_complete && (e.target.style.backgroundColor = '#00c853')}
              onMouseOut={(e) => vitalsState.measurement_complete && (e.target.style.backgroundColor = '#00E676')}
              disabled={!vitalsState.measurement_complete}
            >
              {vitalsState.measurement_complete ? "Continue to Meeting" : "Please wait..."}
            </button>
          </div>
        ) : (
          <>
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
          </>
        )}
      </section>

      {isPrescriptionOpen && (
        <aside className="prescription-sidebar">
          <PrescriptionPanel appointmentId={appointmentId} onClose={() => setIsPrescriptionOpen(false)} />
        </aside>
      )}
    </div>
  );
};

export default VideoConsultation;
