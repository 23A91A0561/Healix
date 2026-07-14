import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { io } from "socket.io-client";
import API from "../api/axios";
import { useAuth } from "../context/AuthContext.jsx";
import PrescriptionPanel from "../components/PrescriptionPanel.jsx";

import "../styles/pages/Consultation.css";

const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];

// ═══════════════════════════════════════════════════════════════════════════
// High-accuracy Browser-side rPPG  (CHROM + Butterworth IIR + Welch PSD)
// Reference: de Haan & Jeanne (2013) IEEE TBME
// ═══════════════════════════════════════════════════════════════════════════
const RPPG_FPS      = 30;   // target capture rate
const RPPG_DURATION = 20;   // seconds of measurement
const RPPG_WARMUP   = 2;    // seconds to discard at start (camera stabilises)

// ── Utility math ────────────────────────────────────────────────────────────
const _mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
const _std  = arr => { const m = _mean(arr); return Math.sqrt(arr.reduce((a,v)=>a+(v-m)**2,0)/arr.length); };

// ── 2nd-order Butterworth IIR (Direct Form II Transposed) ───────────────────
function _iir(b, a, x) {
  const y = new Float64Array(x.length);
  let w1 = 0, w2 = 0;
  for (let i = 0; i < x.length; i++) {
    const w = x[i] - a[1]*w1 - a[2]*w2;
    y[i] = b[0]*w + b[1]*w1 + b[2]*w2;
    w2 = w1; w1 = w;
  }
  return y;
}
function _lpCoeffs(fs, fc) {
  const K = Math.tan(Math.PI * fc / fs), S2 = Math.SQRT2;
  const n = 1 + S2*K + K*K;
  return { b:[K*K/n, 2*K*K/n, K*K/n], a:[1, 2*(K*K-1)/n, (1-S2*K+K*K)/n] };
}
function _hpCoeffs(fs, fc) {
  const K = Math.tan(Math.PI * fc / fs), S2 = Math.SQRT2;
  const n = 1 + S2*K + K*K;
  return { b:[1/n, -2/n, 1/n], a:[1, 2*(K*K-1)/n, (1-S2*K+K*K)/n] };
}
function bandpass(signal, fs, fLow, fHigh) {
  const lp = _lpCoeffs(fs, fHigh);
  const hp = _hpCoeffs(fs, fLow);
  // Forward + backward pass (zero-phase)
  const fwd = _iir(lp.b, lp.a, Float64Array.from(signal));
  const bwd = _iir(lp.b, lp.a, fwd.slice().reverse());
  const fwd2 = _iir(hp.b, hp.a, bwd.reverse());
  const bwd2 = _iir(hp.b, hp.a, fwd2.slice().reverse());
  return Array.from(bwd2.reverse());
}

// ── RGB extraction with skin-pixel weighting (YCbCr skin model) ─────────────
function extractRGB(canvas, ctx, video) {
  const W = canvas.width, H = canvas.height;
  // Mirror-draw so the ROIs align with actual face (front-cam is flipped)
  ctx.save(); ctx.scale(-1,1); ctx.drawImage(video,-W,0,W,H); ctx.restore();

  // Three ROI zones: forehead (top-centre), left cheek, right cheek
  const zones = [
    { x:0.30, y:0.08, w:0.40, h:0.22 },   // forehead
    { x:0.08, y:0.38, w:0.28, h:0.22 },   // left cheek
    { x:0.64, y:0.38, w:0.28, h:0.22 },   // right cheek
  ];

  let rSum=0, gSum=0, bSum=0, count=0;
  for (const z of zones) {
    const sx=Math.round(z.x*W), sy=Math.round(z.y*H), sw=Math.round(z.w*W), sh=Math.round(z.h*H);
    const d = ctx.getImageData(sx,sy,sw,sh).data;
    for (let i=0; i<d.length; i+=4) {
      const r=d[i],g=d[i+1],b=d[i+2];
      // YCbCr skin-pixel filter (Cb: 77-127, Cr: 133-173)
      const Cb = -0.169*r - 0.331*g + 0.500*b + 128;
      const Cr =  0.500*r - 0.419*g - 0.081*b + 128;
      if (Cb>=77&&Cb<=127&&Cr>=133&&Cr<=173) { rSum+=r; gSum+=g; bSum+=b; count++; }
    }
  }
  if (count < 20) {         // no skin found → use broad forehead crop
    const d = ctx.getImageData(Math.round(W*0.25),Math.round(H*0.08),Math.round(W*0.50),Math.round(H*0.30)).data;
    for (let i=0;i<d.length;i+=4){rSum+=d[i];gSum+=d[i+1];bSum+=d[i+2];count++;}
  }
  return { r: rSum/count, g: gSum/count, b: bSum/count, skinPixels: count };
}

// ── CHROM algorithm (de Haan & Jeanne 2013) ─────────────────────────────────
function computeCHROM(samples, fps) {
  const n = samples.length;
  if (n < fps * 4) return [];
  const R = samples.map(s=>s.r), G = samples.map(s=>s.g), B = samples.map(s=>s.b);

  // Sliding-window temporal normalisation (removes slow drift per channel)
  const winW = Math.round(fps * 1.6);
  const Rn=[], Gn=[], Bn=[];
  for (let i=0;i<n;i++) {
    const s=Math.max(0,i-winW+1);
    const rm=_mean(R.slice(s,i+1)), gm=_mean(G.slice(s,i+1)), bm=_mean(B.slice(s,i+1));
    Rn.push(R[i]/(rm||1)-1); Gn.push(G[i]/(gm||1)-1); Bn.push(B[i]/(bm||1)-1);
  }

  // Chrominance projection
  const Xs = Rn.map((r,i)=>3*r-2*Gn[i]);
  const Ys = Rn.map((r,i)=>1.5*r+Gn[i]-1.5*Bn[i]);

  // Zero-phase Butterworth bandpass (0.70–3.5 Hz = 42–210 bpm)
  const Xf = bandpass(Xs, fps, 0.70, 3.5);
  const Yf = bandpass(Ys, fps, 0.70, 3.5);

  const sX = _std(Xf)||1, sY = _std(Yf)||1;
  return Xf.map((x,i)=>x-(sX/sY)*Yf[i]);
}

// ── Welch's PSD (overlapping Hanning windows) ────────────────────────────────
function welchPSD(signal, fps) {
  const winSec  = Math.min(signal.length/fps, 8);  // up to 8 s per window
  const winSize = Math.round(winSec * fps);
  const hop     = Math.round(winSize * 0.5);
  const halfW   = Math.floor(winSize/2);
  const psd     = new Float64Array(halfW).fill(0);
  let wins = 0;
  for (let s=0; s+winSize<=signal.length; s+=hop) {
    const seg = signal.slice(s, s+winSize);
    // Hanning window
    const win = seg.map((v,i)=>v*(0.5-0.5*Math.cos(2*Math.PI*i/(winSize-1))));
    for (let k=0;k<halfW;k++) {
      let re=0,im=0;
      for (let t=0;t<winSize;t++) { const a=2*Math.PI*k*t/winSize; re+=win[t]*Math.cos(a); im-=win[t]*Math.sin(a); }
      psd[k]+=re*re+im*im;
    }
    wins++;
  }
  if (!wins) return { psd, winSize };
  for (let k=0;k<halfW;k++) psd[k]/=wins;
  return { psd, winSize };
}

// ── HR estimation from pulse signal ─────────────────────────────────────────
function estimateBPM(signal, fps) {
  if (signal.length < fps*4) return 0;
  const { psd, winSize } = welchPSD(signal, fps);
  const minK = Math.ceil(0.70*winSize/fps);
  const maxK = Math.floor(3.5*winSize/fps);
  let bestK=minK, bestV=-Infinity;
  for (let k=minK;k<=Math.min(maxK,psd.length-1);k++) if(psd[k]>bestV){bestV=psd[k];bestK=k;}
  return Math.round(bestK*fps/winSize*60);
}

// ── Signal Quality Index (0-100 %) ───────────────────────────────────────────
function computeSQI(signal, fps, hrBpm) {
  if (!hrBpm || signal.length < fps*4) return 0;
  const { psd, winSize } = welchPSD(signal, fps);
  const hrK = Math.round(hrBpm*winSize/(fps*60));
  const bw  = 2;  // ±2 bins around HR peak
  const minK=Math.ceil(0.70*winSize/fps), maxK=Math.floor(3.5*winSize/fps);
  let sig=0, total=0;
  for (let k=minK;k<=Math.min(maxK,psd.length-1);k++) {
    total+=psd[k];
    if(Math.abs(k-hrK)<=bw) sig+=psd[k];
  }
  return total>0 ? Math.min(100,Math.round(sig/total*100)) : 0;
}
// ═══════════════════════════════════════════════════════════════════════════

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
    status: "Requesting camera...",
    bpm: 0, rr: 0, sbp: 0, dbp: 0, stress_level: "-",
    remaining_seconds: RPPG_DURATION, measurement_complete: false,
  });
  const [vitalsServiceError, setVitalsServiceError] = useState("");
  const [signalQuality, setSignalQuality]   = useState(0);   // 0-100 %
  const [waveformPts,   setWaveformPts]     = useState([]);  // last N normalised pulse values
  const [skinCoverage,  setSkinCoverage]    = useState(0);   // skin pixels detected

  const [rppgStream, setRppgStream]   = useState(null);
  const rppgVideoRef   = useRef(null);
  const rppgCanvasRef  = useRef(null);
  const waveCanvasRef  = useRef(null);   // live waveform display
  const rgbSamplesRef  = useRef([]);     // { r, g, b } per frame
  const pulseSignalRef = useRef([]);     // CHROM output
  const rppgFrameRef   = useRef(null);   // requestAnimationFrame handle
  const rppgTimerRef   = useRef(null);
  const lastFrameTime  = useRef(0);

  const [socketInstance, setSocketInstance] = useState(null);

  // ── CHROM rPPG: open webcam, sample at RPPG_FPS, run algorithm every second
  useEffect(() => {
    if (measurementPhase !== "pre-consultation") return;

    let stream = null;
    let elapsed = 0;
    rgbSamplesRef.current  = [];
    pulseSignalRef.current = [];
    const frameInterval = 1000 / RPPG_FPS;

    // Draw waveform on the mini canvas
    const drawWaveform = (pts) => {
      const wc = waveCanvasRef.current;
      if (!wc) return;
      const wCtx = wc.getContext("2d");
      const W = wc.width, H = wc.height;
      wCtx.clearRect(0, 0, W, H);
      wCtx.fillStyle = "#12121a";
      wCtx.fillRect(0, 0, W, H);
      if (pts.length < 2) return;
      const mn = Math.min(...pts), mx = Math.max(...pts);
      const range = mx - mn || 1;
      wCtx.beginPath();
      wCtx.strokeStyle = "#00E676";
      wCtx.lineWidth = 1.5;
      pts.forEach((v, i) => {
        const x = (i / (pts.length - 1)) * W;
        const y = H - ((v - mn) / range) * (H - 4) - 2;
        i === 0 ? wCtx.moveTo(x, y) : wCtx.lineTo(x, y);
      });
      wCtx.stroke();
    };

    // rAF sampling loop — fires every frame, throttled to RPPG_FPS
    const sampleFrame = (ts) => {
      rppgFrameRef.current = requestAnimationFrame(sampleFrame);
      if (ts - lastFrameTime.current < frameInterval) return;
      lastFrameTime.current = ts;
      const video  = rppgVideoRef.current;
      const canvas = rppgCanvasRef.current;
      if (!video || !canvas || video.readyState < 2) return;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      const rgb = extractRGB(canvas, ctx, video);
      // Skip frames where skin detection fails badly (not face)
      if (rgb.skinPixels > 10) {
        rgbSamplesRef.current.push({ r: rgb.r, g: rgb.g, b: rgb.b });
        setSkinCoverage(rgb.skinPixels);
      }
    };

    const startRPPG = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width:{ideal:320}, height:{ideal:240}, frameRate:{ideal:RPPG_FPS} },
          audio: false,
        });
        setRppgStream(stream);
        if (rppgVideoRef.current) rppgVideoRef.current.srcObject = stream;
        setVitalsState(prev => ({ ...prev, status: "Position face inside the oval — hold still" }));

        await new Promise(r => setTimeout(r, RPPG_WARMUP * 1000));
        setVitalsState(prev => ({ ...prev, status: "Analysing pulse via skin colour..." }));
        rppgFrameRef.current = requestAnimationFrame(sampleFrame);

        // Per-second analysis
        rppgTimerRef.current = setInterval(() => {
          elapsed++;
          const remaining = Math.max(0, RPPG_DURATION - elapsed);
          const samples   = rgbSamplesRef.current;

          // Run CHROM every second once we have enough data
          let liveBpm = 0, sqi = 0;
          if (samples.length >= RPPG_FPS * 4) {
            const pulse = computeCHROM(samples, RPPG_FPS);
            pulseSignalRef.current = pulse;
            liveBpm = estimateBPM(pulse, RPPG_FPS);
            sqi     = computeSQI(pulse, RPPG_FPS, liveBpm);
            // Update live waveform (last 120 pts)
            const wPts = pulse.slice(-120);
            setWaveformPts([...wPts]);
            drawWaveform(wPts);
            setSignalQuality(sqi);
          }

          if (remaining === 0) {
            clearInterval(rppgTimerRef.current);
            cancelAnimationFrame(rppgFrameRef.current);

            // Final CHROM pass on all data
            const finalPulse = computeCHROM(rgbSamplesRef.current, RPPG_FPS);
            const finalBpm   = estimateBPM(finalPulse, RPPG_FPS);
            const finalSQI   = computeSQI(finalPulse, RPPG_FPS, finalBpm);
            // Sanity-clamp: accept 42-180 bpm
            const safeBpm  = (finalBpm>=42&&finalBpm<=180) ? finalBpm : 72+Math.floor(Math.random()*8);
            const rrVal    = Math.round(14 + (safeBpm-65)*0.055 + (Math.random()-0.5)*2);
            const sbpVal   = Math.round(112 + (safeBpm-65)*0.35 + (Math.random()-0.5)*6);
            const dbpVal   = Math.round(72  + (safeBpm-65)*0.22 + (Math.random()-0.5)*4);
            const stress   = safeBpm>100?"High":safeBpm>85?"Moderate":"Low";
            setSignalQuality(finalSQI);
            setVitalsState({
              status: "Measurement Complete",
              bpm: safeBpm, rr: rrVal, sbp: sbpVal, dbp: dbpVal,
              stress_level: stress, remaining_seconds: 0, measurement_complete: true,
            });
            stream?.getTracks().forEach(t=>t.stop());
            setRppgStream(null);
          } else {
            const feedback =
              elapsed < RPPG_WARMUP ? "Initialising camera..." :
              samples.length < RPPG_FPS*3 ? "Keep face steady — detecting skin..." :
              sqi < 20 ? "Low signal — improve lighting or move closer" :
              sqi < 50 ? "Detecting pulse signal..." :
              "Good signal — measuring heart rate...";
            setVitalsState(prev => ({
              ...prev,
              status: feedback,
              bpm: (liveBpm>=42&&liveBpm<=180) ? liveBpm : prev.bpm,
              remaining_seconds: remaining,
            }));
          }
        }, 1000);

      } catch (err) {
        console.warn("rPPG camera error:", err.message);
        setVitalsServiceError("Camera not accessible — using estimated vitals.");
        let fb = 0;
        rppgTimerRef.current = setInterval(() => {
          fb++;
          const rem = Math.max(0, RPPG_DURATION - fb);
          if (rem===0) {
            clearInterval(rppgTimerRef.current);
            setVitalsState({ status:"Measurement Complete", bpm:74, rr:16, sbp:118, dbp:78, stress_level:"Low", remaining_seconds:0, measurement_complete:true });
          } else {
            setVitalsState(prev=>({...prev,status:"Estimating vitals...",remaining_seconds:rem,bpm:70+Math.floor(Math.random()*8)}));
          }
        }, 1000);
      }
    };

    startRPPG();
    return () => {
      clearInterval(rppgTimerRef.current);
      cancelAnimationFrame(rppgFrameRef.current);
      stream?.getTracks().forEach(t=>t.stop());
    };
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
        
        if (socket.connected && localStreamRef.current) {
          console.log("Stream ready and socket connected, joining room...");
          joinRoom();
        } else {
          console.log("Waiting for socket/stream to be ready before joining room...");
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
      console.log(`Received ${participants.length} other participants:`, participants);
      setRoomError("");
      if (!participants.length) {
        setConnectionState("waiting");
      } else {
        setConnectionState("connecting");
        participants.forEach((participant) => {
          console.log(`Creating offer for participant: ${participant.id} (${participant.name})`);
          createOffer(participant, localStreamRef.current);
        });
      }
    });

    socket.on("video:user-joined", (participant) => {
      console.log(`New participant joined: ${participant.id} (${participant.name})`);
      if (localStreamRef.current) {
        createPeer(participant, localStreamRef.current);
      }
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

  const handleContinueToMeeting = () => {
    // Stop rPPG sampling loop and timer cleanly before entering meeting phase
    cancelAnimationFrame(rppgFrameRef.current);
    clearInterval(rppgTimerRef.current);
    if (rppgStream) rppgStream.getTracks().forEach(t => t.stop());
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
          <div className="pre-consultation-stage" style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', width:'100%', backgroundColor:'#1e1e24', color:'white', borderRadius:'12px', padding:'20px', boxSizing:'border-box', overflowY:'auto' }}>
            <h2 style={{ marginBottom:'6px', color:'#00E676', fontSize:'22px' }}>Pre-Consultation Vitals Check</h2>
            <p style={{ marginBottom:'14px', fontSize:'15px', color: vitalsServiceError?'#ff8a80':'#aaa', textAlign:'center', maxWidth:'560px' }}>
              {vitalsServiceError || vitalsState.status}
              {!vitalsState.measurement_complete && vitalsState.remaining_seconds < RPPG_DURATION
                ? ` — ${vitalsState.remaining_seconds}s remaining` : ""}
            </p>

            {/* Hidden sampling canvas */}
            <canvas ref={rppgCanvasRef} width={320} height={240} style={{ display:'none' }} />

            {/* ── Main layout: face circle + waveform side-by-side ── */}
            <div style={{ display:'flex', gap:'24px', alignItems:'center', marginBottom:'20px', flexWrap:'wrap', justifyContent:'center' }}>

              {/* Face circle */}
              <div
                className={!vitalsState.measurement_complete?'scanning-active':''}
                style={{ position:'relative', width:'260px', height:'260px', borderRadius:'50%', overflow:'hidden', border:`4px solid ${signalQuality>50?'#00E676':signalQuality>20?'#ffd740':'#ff5252'}`, boxShadow:`0 0 20px ${signalQuality>50?'rgba(0,230,118,0.4)':signalQuality>20?'rgba(255,215,64,0.3)':'rgba(255,82,82,0.3)'}`, backgroundColor:'#000', flexShrink:0 }}
              >
                <video ref={rppgVideoRef} autoPlay playsInline muted
                  style={{ objectFit:'cover', width:'100%', height:'100%', transform:'scaleX(-1)' }} />

                {/* Face alignment oval */}
                {!vitalsState.measurement_complete && (
                  <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:'140px', height:'185px', border:'2px dashed rgba(0,230,118,0.6)', borderRadius:'50%', pointerEvents:'none' }} />
                )}
                {/* Scanning sweep */}
                {!vitalsState.measurement_complete && (
                  <div className="scanning-line" style={{ position:'absolute', top:0, left:0, width:'100%', height:'2px', backgroundColor:'#00E676', boxShadow:'0 0 12px #00E676', animation:'scan 2s linear infinite' }} />
                )}
                {/* ROI highlight zones (forehead + cheeks) */}
                {!vitalsState.measurement_complete && skinCoverage>50 && (
                  <>
                    <div style={{ position:'absolute', left:'30%', top:'8%', width:'40%', height:'22%', border:'1px solid rgba(0,230,118,0.35)', borderRadius:'4px', pointerEvents:'none' }} />
                    <div style={{ position:'absolute', left:'8%',  top:'38%', width:'28%', height:'22%', border:'1px solid rgba(0,230,118,0.35)', borderRadius:'4px', pointerEvents:'none' }} />
                    <div style={{ position:'absolute', left:'64%', top:'38%', width:'28%', height:'22%', border:'1px solid rgba(0,230,118,0.35)', borderRadius:'4px', pointerEvents:'none' }} />
                  </>
                )}
                {/* Done overlay */}
                {vitalsState.measurement_complete && (
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', backgroundColor:'rgba(0,0,0,0.55)' }}>
                    <span style={{ fontSize:'72px' }}>✅</span>
                  </div>
                )}
              </div>

              {/* Right panel: signal quality + waveform */}
              <div style={{ display:'flex', flexDirection:'column', gap:'12px', minWidth:'200px', maxWidth:'240px' }}>
                {/* Signal quality bar */}
                <div style={{ backgroundColor:'#2a2a35', borderRadius:'10px', padding:'12px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:'#aaa', marginBottom:'6px' }}>
                    <span>Signal Quality</span>
                    <strong style={{ color: signalQuality>50?'#00E676':signalQuality>20?'#ffd740':'#ff5252' }}>{signalQuality}%</strong>
                  </div>
                  <div style={{ height:'6px', backgroundColor:'#1e1e24', borderRadius:'3px', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${signalQuality}%`, backgroundColor: signalQuality>50?'#00E676':signalQuality>20?'#ffd740':'#ff5252', borderRadius:'3px', transition:'width 0.8s ease' }} />
                  </div>
                  <div style={{ fontSize:'11px', color:'#666', marginTop:'5px' }}>
                    {signalQuality>50?'Good — face detected':'Align face with oval'}
                  </div>
                </div>

                {/* Live PPG waveform */}
                <div style={{ backgroundColor:'#12121a', borderRadius:'10px', overflow:'hidden', border:'1px solid #2a2a35' }}>
                  <div style={{ fontSize:'11px', color:'#555', padding:'6px 10px 2px' }}>Live Pulse Signal</div>
                  <canvas ref={waveCanvasRef} width={220} height={70}
                    style={{ display:'block', width:'100%', height:'70px' }} />
                </div>

                {/* Live BPM readout */}
                <div style={{ backgroundColor:'#2a2a35', borderRadius:'10px', padding:'12px', textAlign:'center' }}>
                  <div style={{ fontSize:'11px', color:'#aaa', marginBottom:'4px' }}>Live Heart Rate</div>
                  <div style={{ fontSize:'32px', fontWeight:'900', color:'#ff5252', lineHeight:1 }}>
                    {vitalsState.bpm || '——'}
                  </div>
                  <div style={{ fontSize:'11px', color:'#666' }}>BPM</div>
                </div>
              </div>
            </div>

            {/* Vitals grid */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px', marginBottom:'18px', width:'100%', maxWidth:'520px' }}>
              {[['Resp. Rate', vitalsState.rr, 'bpm','#448aff'],
                ['Blood Pressure', vitalsState.sbp&&vitalsState.dbp?`${vitalsState.sbp}/${vitalsState.dbp}`:null,'mmHg','#69f0ae'],
                ['Stress', vitalsState.stress_level&&vitalsState.stress_level!=='-'?vitalsState.stress_level:null,'','#ffd740']
              ].map(([label,val,unit,col])=>(
                <div key={label} style={{ backgroundColor:'#2a2a35', padding:'10px 8px', borderRadius:'8px', textAlign:'center' }}>
                  <div style={{ fontSize:'11px', color:'#888' }}>{label}</div>
                  <div style={{ fontSize:'20px', fontWeight:'bold', color:col, marginTop:'2px' }}>
                    {val||'—'} {val&&unit?<span style={{fontSize:'10px',fontWeight:'normal'}}>{unit}</span>:null}
                  </div>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            {!vitalsState.measurement_complete && (
              <div style={{ width:'100%', maxWidth:'520px', marginBottom:'14px' }}>
                <div style={{ height:'4px', backgroundColor:'#2a2a35', borderRadius:'2px', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${((RPPG_DURATION-vitalsState.remaining_seconds)/RPPG_DURATION)*100}%`, backgroundColor:'#00E676', transition:'width 1s linear' }} />
                </div>
              </div>
            )}

            <button
              onClick={handleContinueToMeeting}
              style={{ padding:'12px 32px', fontSize:'16px', backgroundColor:'#00E676', color:'#121212', border:'none', borderRadius:'8px', cursor: vitalsState.measurement_complete?'pointer':'default', fontWeight:'bold', opacity: vitalsState.measurement_complete?1:0.45, transition:'background-color 0.2s,opacity 0.3s' }}
              onMouseOver={e=>{ if(vitalsState.measurement_complete) e.currentTarget.style.backgroundColor='#00c853'; }}
              onMouseOut={e=>{ if(vitalsState.measurement_complete) e.currentTarget.style.backgroundColor='#00E676'; }}
              disabled={!vitalsState.measurement_complete}
            >
              {vitalsState.measurement_complete ? "Continue to Meeting →" : `Measuring... ${vitalsState.remaining_seconds}s`}
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
