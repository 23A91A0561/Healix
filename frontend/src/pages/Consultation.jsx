import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaDesktop, FaMicrophone, FaMicrophoneSlash, FaPhoneSlash, FaVideo, FaVideoSlash } from 'react-icons/fa';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { socket } from '../services/socket.js';

export default function Consultation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const localRef = useRef(null);
  const streamRef = useRef(null);
  const [timer, setTimer] = useState(0);
  const [connectionState, setConnectionState] = useState('connecting');
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    socket.emit('consultation:join', id);
    navigator.mediaDevices?.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 15, max: 30 },
      },
      audio: true,
    }).then((stream) => {
      streamRef.current = stream;
      if (localRef.current) localRef.current.srcObject = stream;
    });

    const interval = setInterval(() => setTimer((v) => v + 1), 1000);

    const handleSessionStatus = (payload) => {
      if (payload.appointment !== id) return;
      if (payload.status === 'patient_joined') setConnectionState('waiting-for-doctor');
      if (payload.status === 'doctor_joined') setConnectionState('connected');
    };

    socket.on('session:status', handleSessionStatus);
    if (user?.role === 'patient') socket.emit('session:join-request', { appointment: id, userId: user._id, userName: user.name });
    if (user?.role === 'doctor') socket.emit('session:doctor-join', { appointment: id, userId: user._id, userName: user.name });

    return () => {
      clearInterval(interval);
      socket.off('session:status', handleSessionStatus);
    };
  }, [id, user]);

  const toggleMic = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMicEnabled(!isMicEnabled);
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const endCall = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    socket.emit('call:end', { room: id });
    navigate('/appointments');
  };

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold">Video Consultation</h1>
      <p className="mt-2 text-sm text-slate-500">Session status: {connectionState}</p>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="card overflow-hidden bg-slate-900">
          <video ref={localRef} autoPlay muted playsInline className="aspect-video w-full object-cover" />
          <div className="flex items-center justify-center gap-3 p-4">
            <button onClick={toggleMic} className={`rounded-md p-3 transition ${isMicEnabled ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-red-600 text-white hover:bg-red-700'}`} title={isMicEnabled ? 'Mute' : 'Unmute'}>
              {isMicEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
            </button>
            <button onClick={toggleVideo} className={`rounded-md p-3 transition ${isVideoEnabled ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-red-600 text-white hover:bg-red-700'}`} title={isVideoEnabled ? 'Stop video' : 'Start video'}>
              {isVideoEnabled ? <FaVideo /> : <FaVideoSlash />}
            </button>
            <button className="rounded-md bg-slate-700 p-3 text-white transition hover:bg-slate-600" title="Share screen">
              <FaDesktop />
            </button>
            <button onClick={endCall} className="rounded-md bg-red-600 p-3 text-white transition hover:bg-red-700" title="End call">
              <FaPhoneSlash />
            </button>
          </div>
        </div>
        <aside className="card p-5">
          <h2 className="font-semibold">Consultation tools</h2>
          <p className="mt-3 text-sm text-slate-500">Timer: {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}</p>
          <button className="btn-primary mt-5 w-full">Create Prescription</button>
          <div className="mt-4 h-64 rounded-md bg-slate-50 p-3 text-sm text-slate-500">Chat and uploaded reports appear here.</div>
        </aside>
      </div>
    </DashboardLayout>
  );
}
