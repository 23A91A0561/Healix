"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");

  const createRoom = () => {
    router.push(`/room/${uuidv4()}`);
  };

  const joinRoom = () => {
    const normalizedRoomId = roomId.trim();

    if (!normalizedRoomId) {
      return;
    }

    router.push(`/room/${normalizedRoomId}`);
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf7_0%,#fff5e8_52%,#f7efe4_100%)] px-4 py-10 text-slate-800">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-8">
            <div className="inline-flex rounded-full border border-amber-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.38em] text-amber-700 shadow-sm">
              CartickMeet
            </div>

            <div className="space-y-4">
              <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-slate-900 sm:text-6xl">
                Simple room-based video calls for small teams and friends.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                Create a room, share the link or room ID, and meet instantly
                with up to 4 participants. Video, chat, mute, camera controls,
                and room isolation are all built in.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.75rem] border border-amber-100 bg-white p-5 shadow-sm">
                <p className="text-3xl font-semibold text-amber-700">4</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Active seats available in every room.
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-amber-100 bg-white p-5 shadow-sm">
                <p className="text-3xl font-semibold text-amber-700">Live</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Real-time signaling, chat, and WebRTC media.
                </p>
              </div>
              <div className="rounded-[1.75rem] border border-amber-100 bg-white p-5 shadow-sm">
                <p className="text-3xl font-semibold text-amber-700">0 DB</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  No database needed for active room membership.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-amber-100 bg-white p-7 shadow-[0_24px_80px_rgba(186,104,9,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.34em] text-amber-700">
              Start Meeting
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900">
              Create a room or join one
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Share the generated room link with others or paste an existing
              room ID to enter directly.
            </p>

            <div className="mt-8 space-y-4">
              <button
                type="button"
                onClick={createRoom}
                className="w-full rounded-full bg-amber-500 px-5 py-4 text-base font-semibold text-white transition hover:bg-amber-600"
              >
                Create Room
              </button>

              <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
                <label
                  htmlFor="room-id"
                  className="mb-3 block text-sm font-medium text-slate-700"
                >
                  Join with room ID
                </label>
                <input
                  id="room-id"
                  value={roomId}
                  onChange={(event) => setRoomId(event.target.value)}
                  placeholder="Paste room ID"
                  className="w-full rounded-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={joinRoom}
                  className="mt-3 w-full rounded-full border border-amber-200 bg-white px-5 py-3 text-sm font-medium text-amber-700 transition hover:bg-amber-50"
                >
                  Join Room
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
