"use client";

import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";

export type CallStatus = "waiting" | "connecting" | "connected";

export type RemotePeer = {
  id: string;
  stream: MediaStream;
};

export type ChatMessage = {
  id: string;
  sender: string;
  message: string;
  timestamp: number;
  isSelf: boolean;
};

type SignalingPayload = {
  caller: string;
  sdp: RTCSessionDescriptionInit;
};

type CandidatePayload = {
  caller: string;
  candidate: RTCIceCandidateInit;
};

type ServerChatMessage = {
  id: string;
  sender: string;
  message: string;
  timestamp: number;
};

type UseWebRTCResult = {
  remotePeers: RemotePeer[];
  chatMessages: ChatMessage[];
  status: CallStatus;
  roomError: string | null;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  sendChatMessage: (message: string) => void;
  toggleMicrophone: () => void;
  toggleCamera: () => void;
  hangUp: () => void;
};

const connectedStates = new Set<RTCPeerConnectionState>([
  "connected",
]);

export const useWebRTC = (
  socket: Socket | null,
  roomId: string,
  localStream: MediaStream | null
): UseWebRTCResult => {
  const [remotePeers, setRemotePeers] = useState<RemotePeer[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<CallStatus>("waiting");
  const [roomError, setRoomError] = useState<string | null>(null);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);

  const socketRef = useRef<Socket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const remoteStreamsRef = useRef<Record<string, MediaStream>>({});
  const pendingCandidatesRef = useRef<Record<string, RTCIceCandidateInit[]>>({});

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    if (!socket || !localStream) {
      return;
    }

    const configuration: RTCConfiguration = {
      iceServers: [
        {
          urls:
            process.env.NEXT_PUBLIC_STUN_SERVER ??
            "stun:stun.l.google.com:19302",
        },
      ],
    };

    const syncStatus = () => {
      const peers = Object.values(peerConnectionsRef.current);

      if (peers.length === 0) {
        setStatus("waiting");
        return;
      }

      const hasConnectedPeer = peers.some((peer) =>
        connectedStates.has(peer.connectionState)
      );

      setStatus(hasConnectedPeer ? "connected" : "connecting");
    };

    const upsertRemotePeer = (peerId: string, stream: MediaStream) => {
      setRemotePeers((currentPeers) => {
        const existingPeer = currentPeers.find((peer) => peer.id === peerId);

        if (existingPeer) {
          return currentPeers.map((peer) =>
            peer.id === peerId ? { ...peer, stream } : peer
          );
        }

        return [...currentPeers, { id: peerId, stream }];
      });
    };

    const removePeer = (peerId: string) => {
      const peer = peerConnectionsRef.current[peerId];

      if (peer) {
        peer.ontrack = null;
        peer.onicecandidate = null;
        peer.onconnectionstatechange = null;
        peer.close();
        delete peerConnectionsRef.current[peerId];
      }

      delete remoteStreamsRef.current[peerId];
      delete pendingCandidatesRef.current[peerId];

      setRemotePeers((currentPeers) =>
        currentPeers.filter((remotePeer) => remotePeer.id !== peerId)
      );

      syncStatus();
    };

    const flushPendingCandidates = async (peerId: string) => {
      const peer = peerConnectionsRef.current[peerId];
      const queuedCandidates = pendingCandidatesRef.current[peerId] ?? [];

      if (!peer || !peer.remoteDescription) {
        return;
      }

      while (queuedCandidates.length > 0) {
        const candidate = queuedCandidates.shift();

        if (!candidate) {
          continue;
        }

        try {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (candidateError) {
          console.error("Failed to add queued ICE candidate:", candidateError);
        }
      }

      pendingCandidatesRef.current[peerId] = queuedCandidates;
    };

    const createConnection = (peerId: string) => {
      const existingConnection = peerConnectionsRef.current[peerId];

      if (existingConnection) {
        return existingConnection;
      }

      const peerConnection = new RTCPeerConnection(configuration);

      localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
      });

      peerConnection.onicecandidate = (event) => {
        if (!event.candidate) {
          return;
        }

        socket.emit("ice-candidate", {
          target: peerId,
          candidate: event.candidate.toJSON(),
        });
      };

      peerConnection.ontrack = (event) => {
        const incomingStream =
          event.streams[0] ?? remoteStreamsRef.current[peerId] ?? new MediaStream();

        if (!event.streams[0]) {
          incomingStream.addTrack(event.track);
        }

        remoteStreamsRef.current[peerId] = incomingStream;
        upsertRemotePeer(peerId, incomingStream);
        syncStatus();
      };

      peerConnection.onconnectionstatechange = () => {
        if (
          peerConnection.connectionState === "failed" ||
          peerConnection.connectionState === "closed"
        ) {
          removePeer(peerId);
          return;
        }

        syncStatus();
      };

      peerConnectionsRef.current[peerId] = peerConnection;
      syncStatus();

      return peerConnection;
    };

    const createOffer = async (peerId: string) => {
      const peerConnection = createConnection(peerId);

      try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        socket.emit("offer", {
          target: peerId,
          sdp: offer,
        });
      } catch (offerError) {
        console.error("Failed to create offer:", offerError);
      }
    };

    const handleAllUsers = (users: string[]) => {
      setRoomError(null);

      if (users.length === 0) {
        setStatus("waiting");
        return;
      }

      setStatus("connecting");
      users.forEach((userId) => {
        void createOffer(userId);
      });
    };

    const handleUserJoined = (userId: string) => {
      createConnection(userId);
      setStatus("connecting");
    };

    const handleOffer = async ({ caller, sdp }: SignalingPayload) => {
      try {
        const peerConnection = createConnection(caller);

        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(sdp)
        );
        await flushPendingCandidates(caller);

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        socket.emit("answer", {
          target: caller,
          sdp: answer,
        });

        setStatus("connecting");
      } catch (offerError) {
        console.error("Failed to handle offer:", offerError);
      }
    };

    const handleAnswer = async ({ caller, sdp }: SignalingPayload) => {
      const peerConnection = peerConnectionsRef.current[caller];

      if (!peerConnection || peerConnection.currentRemoteDescription) {
        return;
      }

      try {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(sdp)
        );
        await flushPendingCandidates(caller);
      } catch (answerError) {
        console.error("Failed to handle answer:", answerError);
      }
    };

    const handleIceCandidate = async ({
      caller,
      candidate,
    }: CandidatePayload) => {
      const peerConnection = peerConnectionsRef.current[caller];

      if (!peerConnection || !peerConnection.remoteDescription) {
        const currentQueue = pendingCandidatesRef.current[caller] ?? [];
        currentQueue.push(candidate);
        pendingCandidatesRef.current[caller] = currentQueue;
        return;
      }

      try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (candidateError) {
        console.error("Failed to add ICE candidate:", candidateError);
      }
    };

    const handleUserLeft = (peerId: string) => {
      removePeer(peerId);
    };

    const handleChatMessage = (incomingMessage: ServerChatMessage) => {
      setChatMessages((currentMessages) => [
        ...currentMessages,
        {
          ...incomingMessage,
          isSelf: incomingMessage.sender === socket.id,
        },
      ]);
    };

    const handleRoomFull = () => {
      setRoomError("This room already has 4 participants.");
    };

    const handleRoomError = (message: string) => {
      setRoomError(message);
    };

    socket.on("all-users", handleAllUsers);
    socket.on("user-joined", handleUserJoined);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("user-left", handleUserLeft);
    socket.on("chat-message", handleChatMessage);
    socket.on("room-full", handleRoomFull);
    socket.on("room-error", handleRoomError);

    socket.emit("join-room", { roomId });

    return () => {
      socket.off("all-users", handleAllUsers);
      socket.off("user-joined", handleUserJoined);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("user-left", handleUserLeft);
      socket.off("chat-message", handleChatMessage);
      socket.off("room-full", handleRoomFull);
      socket.off("room-error", handleRoomError);

      Object.keys(peerConnectionsRef.current).forEach((peerId) => {
        removePeer(peerId);
      });
    };
  }, [localStream, roomId, socket]);

  const sendChatMessage = (message: string) => {
    const nextSocket = socketRef.current;
    const normalizedMessage = message.trim();

    if (!nextSocket || !normalizedMessage) {
      return;
    }

    nextSocket.emit("chat-message", { message: normalizedMessage });
  };

  const toggleMicrophone = () => {
    const stream = localStreamRef.current;

    if (!stream) {
      return;
    }

    const shouldEnable = !stream.getAudioTracks().every((track) => track.enabled);

    stream.getAudioTracks().forEach((track) => {
      track.enabled = shouldEnable;
    });

    setIsMicEnabled(shouldEnable);
  };

  const toggleCamera = () => {
    const stream = localStreamRef.current;

    if (!stream) {
      return;
    }

    const shouldEnable = !stream.getVideoTracks().every((track) => track.enabled);

    stream.getVideoTracks().forEach((track) => {
      track.enabled = shouldEnable;
    });

    setIsCameraEnabled(shouldEnable);
  };

  const hangUp = () => {
    const nextSocket = socketRef.current;
    const stream = localStreamRef.current;

    if (nextSocket?.connected) {
      nextSocket.emit("leave-room");
    }

    Object.values(peerConnectionsRef.current).forEach((peerConnection) => {
      peerConnection.close();
    });

    peerConnectionsRef.current = {};
    remoteStreamsRef.current = {};
    pendingCandidatesRef.current = {};

    setRemotePeers([]);
    setChatMessages([]);
    setStatus("waiting");

    stream?.getTracks().forEach((track) => track.stop());

    (
      window as Window & {
        __localStream?: MediaStream | null;
      }
    ).__localStream = null;

    nextSocket?.disconnect();
  };

  return {
    remotePeers,
    chatMessages,
    status,
    roomError,
    isMicEnabled,
    isCameraEnabled,
    sendChatMessage,
    toggleMicrophone,
    toggleCamera,
    hangUp,
  };
};
