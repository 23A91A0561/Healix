import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/pages/Consultation.css";

const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];

function VideoTile({ stream, muted = false, label, className = "" }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`video-tile ${className}`}>
      <video ref={videoRef} autoPlay playsInline muted={muted} />
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
      const token = localStorage.getItem("token");
      await API.put(`/appointments/start/${appointmentId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
    } catch (error) {
      console.log(error);
    }
  };

  const markConsultationEnded = async () => {
    if (!appointmentId) return;
    try {
      const token = localStorage.getItem("token");
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
    let isMounted = true;
    const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

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
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;
        cameraTrackRef.current = stream.getVideoTracks()[0] || null;
        setLocalStream(stream);
        setMeetingJoined(true);
        await markConsultationLive();
        joinRoom();
      } catch (error) {
        setRoomError(error.message || "Unable to access camera and microphone.");
        setConnectionState("error");
      }
    };

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

    return () => {
      isMounted = false;
      if (!hasEndedRef.current) {
        hasEndedRef.current = true;
        markConsultationEnded();
      }
      stopCall();
    };
  }, [activeRoomId, displayName, user?.role]);

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

    stopCall();
    navigate(user?.role === "doctor" ? "/doctor" : "/patient");
  };

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
            <VideoTile stream={primaryStream} muted={!primaryPeer} label={primaryLabel} className="primary-video" />
          ) : (
            <div className="empty-stage">
              <h2>Waiting for participant</h2>
              <p>Share this consultation link with the patient or doctor to start the call.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default VideoConsultation;
