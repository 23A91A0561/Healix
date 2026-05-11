"use client";

import { FormEvent, useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { MediaVideo } from "@/components/media-video";
import { VitalsMonitor } from "@/components/VitalsMonitor";
import { RemoteVitals } from "@/components/RemoteVitals";
import { useSocket } from "@/hooks/useSocket";
import { useUserMedia } from "@/hooks/useUserMedia";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useVitals } from "@/hooks/useVitals";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const [chatInput, setChatInput] = useState("");
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const { socket, connectionState, error: socketError } = useSocket();
  const {
    stream: localStream,
    error: mediaError,
    isLoading: isMediaLoading,
  } = useUserMedia();
  const {
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
  } = useWebRTC(socket, roomId, localStream);

  const {
    isMonitoring,
    heartRate,
    respiratoryRate,
    hrv,
    error: vitalsError,
    startVitalsMonitoring,
    stopVitalsMonitoring,
    remoteVitals,
  } = useVitals(socket, roomId, localVideoRef.current);

  // Auto-start vitals monitoring when meeting connects
  useEffect(() => {
    if (status === "connected" && !isMonitoring && localVideoRef.current) {
      startVitalsMonitoring();
    }
  }, [status, isMonitoring, startVitalsMonitoring]);

  // Update video element reference
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const participantSummary = roomError
    ? "4 of 4 seats taken"
    : `${remotePeers.length + 1} of 4 in room`;

  const roomSubtitle = roomError
    ? "This room has reached capacity. Ask the host to share a new room."
    : "Share this room ID or link with up to 3 more participants.";

  const handleSubmitChat = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!chatInput.trim()) {
      return;
    }

    sendChatMessage(chatInput);
    setChatInput("");
  };

  const handleHangUp = () => {
    hangUp();
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf7_0%,#fff6ec_52%,#f6efe3_100%)] text-slate-800">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-5 lg:flex-row">
        <section className="flex min-w-0 flex-1 flex-col gap-4 rounded-[2rem] border border-amber-100 bg-white p-4 shadow-[0_24px_80px_rgba(186,104,9,0.08)] lg:h-[calc(100vh-2.5rem)]">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex rounded-full bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.36em] text-amber-700">
                CartickMeet
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">
                  Meeting Room
                </h1>
                <p className="mt-2 break-all text-sm leading-6 text-slate-500">
                  ID: {roomId}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {roomSubtitle}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:w-[24rem]">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Signal
                </p>
                <p className="mt-2 text-base font-medium capitalize text-slate-900">
                  {connectionState}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Seats
                </p>
                <p className="mt-2 text-base font-medium text-slate-900">
                  {participantSummary}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            {status === "waiting" ? (
              <span
                data-test-id="status-waiting"
                className="rounded-full bg-amber-100 px-3 py-1.5 font-medium text-amber-800"
              >
                Waiting for participants
              </span>
            ) : null}

            {status === "connecting" ? (
              <span
                data-test-id="status-connecting"
                className="rounded-full bg-sky-100 px-3 py-1.5 font-medium text-sky-800"
              >
                Joining call
              </span>
            ) : null}

            {status === "connected" ? (
              <span
                data-test-id="status-connected"
                className="rounded-full bg-emerald-100 px-3 py-1.5 font-medium text-emerald-800"
              >
                Everyone is connected
              </span>
            ) : null}

            {isMediaLoading ? (
              <span className="rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-600">
                Requesting camera and microphone access
              </span>
            ) : null}
          </div>

          {roomError || mediaError || socketError ? (
            <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
              {roomError
                ? "Room capacity reached. This room already has four active participants."
                : mediaError ?? socketError}
            </div>
          ) : null}

          <div className="relative flex-1 rounded-[2rem] border border-slate-200 bg-[#fffaf4] p-3">
            <div
              data-test-id="remote-video-container"
              className={`grid h-full min-h-[22rem] gap-3 ${
                remotePeers.length <= 1
                  ? "grid-cols-1"
                  : "grid-cols-1 md:grid-cols-2"
              }`}
            >
              {remotePeers.length > 0 ? (
                remotePeers.map((peer) => (
                  <div
                    key={peer.id}
                    className="relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-900"
                  >
                    <MediaVideo
                      stream={peer.stream}
                      className="h-full min-h-[17rem] w-full object-cover"
                    />
                    <div className="absolute left-3 top-3 rounded-full bg-white/92 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                      Guest {peer.id.slice(0, 6)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex min-h-[17rem] items-center justify-center rounded-[1.75rem] border border-dashed border-amber-200 bg-white text-center text-slate-500">
                  Remote video tiles will appear here as people join this room.
                </div>
              )}
            </div>

            <div className="absolute bottom-4 right-4 w-44 overflow-hidden rounded-[1.5rem] border border-white bg-slate-900 shadow-xl">
              <MediaVideo
                stream={localStream}
                muted
                data-test-id="local-video"
                className="aspect-video w-full bg-slate-900 object-cover"
              />
              <div className="flex items-center justify-between bg-white px-3 py-2 text-xs font-medium text-slate-700">
                <span>You</span>
                <span>{isCameraEnabled ? "Camera on" : "Camera off"}</span>
              </div>
            </div>
            {/* Hidden video element used by rPPG (VitalLens) for frame capture */}
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{ display: "none" }}
            />
          </div>

          <div className="sticky bottom-0 flex flex-wrap gap-3 rounded-[1.5rem] border border-slate-200 bg-white/90 p-3 backdrop-blur">
            <button
              type="button"
              data-test-id="mute-mic-button"
              onClick={toggleMicrophone}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                isMicEnabled
                  ? "bg-slate-900 text-white hover:bg-slate-700"
                  : "bg-amber-500 text-white hover:bg-amber-600"
              }`}
            >
              {isMicEnabled ? "Mute Mic" : "Unmute Mic"}
            </button>

            <button
              type="button"
              data-test-id="toggle-camera-button"
              onClick={toggleCamera}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                isCameraEnabled
                  ? "bg-slate-900 text-white hover:bg-slate-700"
                  : "bg-sky-500 text-white hover:bg-sky-600"
              }`}
            >
              {isCameraEnabled ? "Turn Camera Off" : "Turn Camera On"}
            </button>

            <button
              type="button"
              data-test-id="hangup-button"
              onClick={handleHangUp}
              className="rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-600"
            >
              Leave Call
            </button>
          </div>
        </section>

        <aside className="flex w-full flex-col gap-4 rounded-[2rem] border border-amber-100 bg-white p-4 shadow-[0_24px_80px_rgba(186,104,9,0.08)] lg:h-[calc(100vh-2.5rem)] lg:w-[24rem]">
          <div>
            <div className="inline-flex rounded-full bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.34em] text-amber-700">
              Room Chat
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">
              Messages
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Use chat for quick notes while you are in the call.
            </p>
          </div>

          <div
            data-test-id="chat-log"
            className="flex min-h-[18rem] flex-1 flex-col gap-3 overflow-y-auto rounded-[1.75rem] border border-slate-200 bg-slate-50 p-3"
          >
            {chatMessages.length > 0 ? (
              chatMessages.map((message) => (
                <div
                  key={message.id}
                  data-test-id="chat-message"
                  className={`max-w-[85%] rounded-[1.25rem] px-3 py-2 text-sm shadow-sm ${
                    message.isSelf
                      ? "self-end bg-amber-500 text-white"
                      : "self-start bg-white text-slate-800"
                  }`}
                >
                  <p className="text-xs opacity-75">
                    {message.isSelf ? "You" : message.sender.slice(0, 6)}
                  </p>
                  <p>{message.message}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                No messages yet. Your room chat will appear here.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmitChat} className="flex gap-2">
            <input
              data-test-id="chat-input"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Type a message"
              className="min-w-0 flex-1 rounded-full border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-amber-500"
            />
            <button
              type="submit"
              data-test-id="chat-submit"
              className="rounded-full bg-amber-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-amber-600"
            >
              Send
            </button>
          </form>
        </aside>

        {/* Vitals Monitor Component */}
        <VitalsMonitor
          isMonitoring={isMonitoring}
          heartRate={heartRate}
          respiratoryRate={respiratoryRate}
          hrv={hrv}
          onStart={startVitalsMonitoring}
          onStop={stopVitalsMonitoring}
          error={vitalsError}
        />
        <RemoteVitals remoteVitals={remoteVitals} />
      </div>
    </main>
  );
}
