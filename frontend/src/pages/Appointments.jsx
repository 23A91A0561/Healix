import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import api from '../services/api.js';

/* ─── helpers ─────────────────────────────────────────────── */
function slotStart(a) { return new Date(a.scheduledAt).getTime(); }
function slotEnd(a)   { return slotStart(a) + (a.durationMinutes || 30) * 60 * 1000; }

function StatusBadge({ status }) {
  const map = {
    pending:   { bg: '#fff7ed', color: '#c2410c', label: 'Pending' },
    confirmed: { bg: '#f0fdf4', color: '#16a34a', label: 'Confirmed' },
    live:      { bg: '#eff6ff', color: '#2563eb', label: '🔴 Live' },
    completed: { bg: '#f8fafc', color: '#64748b', label: 'Completed' },
    cancelled: { bg: '#fef2f2', color: '#dc2626', label: 'Cancelled' },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '3px 10px', borderRadius: 999,
      fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.02em'
    }}>{s.label}</span>
  );
}

function CountdownBadge({ ms }) {
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return (
    <span style={{
      background: 'rgba(37,99,235,0.08)', color: '#2563eb',
      padding: '3px 10px', borderRadius: 999,
      fontSize: '0.78rem', fontWeight: 700
    }}>Starts in {parts.join(' ')}</span>
  );
}

/* ─── single card ─────────────────────────────────────────── */
function AppointmentCard({ appt, now, userId, isDoctor, onApprove, approving }) {
  const start = slotStart(appt);
  const end   = slotEnd(appt);
  const isLive    = now >= start && now < end && appt.status !== 'cancelled';
  const canJoin   = isLive && (appt.status === 'confirmed' || appt.status === 'live');
  const msToStart = start - now;

  const doctorName  = appt.doctor?.name  || 'Doctor';
  const patientName = appt.patient?.name || 'Patient';
  const other = isDoctor ? patientName : `Dr. ${doctorName}`;

  return (
    <article style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 18,
      padding: '22px 24px',
      boxShadow: isLive ? '0 0 0 2px #2563eb, 0 8px 24px rgba(37,99,235,0.12)' : '0 4px 18px rgba(30,41,59,0.07)',
      transition: 'box-shadow 0.3s ease',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {isLive && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, #2563eb, #14b8a6)',
        }} />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {isDoctor ? 'Patient' : 'Doctor'}
          </p>
          <h3 style={{ margin: '4px 0 0', fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>{other}</h3>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <StatusBadge status={appt.status} />
          {!isLive && msToStart > 0 && <CountdownBadge ms={msToStart} />}
        </div>
      </div>

      <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: '6px 24px' }}>
        <InfoRow icon="📅" label={new Date(appt.scheduledAt).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })} />
        <InfoRow icon="⏰" label={`${new Date(appt.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} – ${new Date(end).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`} />
        {appt.type && <InfoRow icon="💬" label={appt.type === 'video' ? 'Video Consultation' : 'Clinic Visit'} />}
        {appt.amount > 0 && (
          <InfoRow
            icon="💳"
            label={`₹${appt.amount} · ${appt.payment?.status === 'success' ? '✅ Paid' : '⏳ Payment pending'}`}
          />
        )}
      </div>

      {/* Actions */}
      <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {/* Doctor: approve pending */}
        {isDoctor && appt.status === 'pending' && (
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={() => onApprove(appt._id)}
            disabled={approving === appt._id}
          >
            {approving === appt._id ? 'Approving…' : '✅ Approve'}
          </button>
        )}

        {/* Join session */}
        {canJoin && (
          <Link
            to={`/consultation/${appt._id}`}
            className="btn btn-primary"
            style={{ flex: 1, textAlign: 'center' }}
          >
            🎥 Join Session
          </Link>
        )}

        {/* Doctor: create prescription */}
        {isDoctor && (appt.status === 'live' || appt.status === 'completed') && (
          <Link
            to={`/prescription/${appt._id}`}
            className="btn btn-secondary"
            style={{ flex: 1, textAlign: 'center' }}
          >
            📝 Prescription
          </Link>
        )}

        {/* Waiting state */}
        {!canJoin && !isLive && appt.status !== 'cancelled' && !(isDoctor && appt.status === 'pending') && (
          <span style={{ color: '#94a3b8', fontSize: '0.88rem', alignSelf: 'center' }}>
            {appt.status === 'confirmed' ? '⏳ Waiting for slot time…' : '—'}
          </span>
        )}
      </div>

      {appt.cancellationReason && (
        <p style={{ marginTop: 12, fontSize: '0.83rem', color: '#dc2626', background: '#fef2f2', borderRadius: 8, padding: '8px 12px', margin: '12px 0 0' }}>
          ❌ Reason: {appt.cancellationReason}
        </p>
      )}
    </article>
  );
}

function InfoRow({ icon, label }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.88rem', color: '#475569' }}>
      <span>{icon}</span><span>{label}</span>
    </span>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{
      textAlign: 'center', padding: '48px 24px',
      background: '#f8fafc', borderRadius: 18,
      border: '1px dashed #cbd5e1', color: '#94a3b8'
    }}>
      <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📭</div>
      <p style={{ margin: 0, fontWeight: 600 }}>{text}</p>
    </div>
  );
}

/* ─── main page ───────────────────────────────────────────── */
export default function Appointments() {
  const { user } = useAuth();
  const { data, loading, error } = useFetch('/appointments');
  const isDoctor = user?.role === 'doctor';

  // Live clock — ticks every second
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const [showHistory, setShowHistory] = useState(false);
  const [approving, setApproving] = useState(null);

  // ── Split into upcoming vs history ──────────────────────
  const { upcoming, history } = useMemo(() => {
    const upcoming = [];
    const history  = [];
    (data || []).forEach(a => {
      const end = slotEnd(a);
      const isPast = now >= end || a.status === 'cancelled' || a.status === 'completed';
      if (isPast) history.push(a);
      else upcoming.push(a);
    });
    // sort upcoming: soonest first; history: most recent first
    upcoming.sort((a, b) => slotStart(a) - slotStart(b));
    history.sort((a, b) => slotStart(b) - slotStart(a));
    return { upcoming, history };
  }, [data, now]);

  // ── Approve handler ──────────────────────────────────────
  const handleApprove = async (id) => {
    setApproving(id);
    try {
      await api.patch(`/appointments/${id}/status`, { status: 'confirmed' });
      window.location.reload();
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to approve appointment');
    } finally {
      setApproving(null);
    }
  };

  return (
    <DashboardLayout>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#1e293b' }}>
            📋 My Appointments
          </h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            {isDoctor ? 'Manage your consultation schedule' : 'Track your booked consultations'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* live clock */}
          <span style={{
            background: 'linear-gradient(135deg, #2563eb, #14b8a6)',
            color: '#fff', borderRadius: 10, padding: '6px 14px',
            fontSize: '0.85rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums'
          }}>
            🕐 {new Date(now).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>

      {/* ── Loading / Error ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
          <div className="loader" />
          <p>Loading appointments…</p>
        </div>
      )}
      {error && (
        <div style={{ background: '#fef2f2', color: '#dc2626', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Upcoming Appointments ── */}
      {!loading && (
        <>
          <SectionHeader
            title="Upcoming Appointments"
            count={upcoming.length}
            accent="#2563eb"
          />
          {upcoming.length === 0
            ? <EmptyState text={isDoctor ? "No upcoming appointments from patients." : "You have no upcoming appointments. Book one from Doctors page!"} />
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20, marginBottom: 36 }}>
                {upcoming.map(a => (
                  <AppointmentCard
                    key={a._id}
                    appt={a}
                    now={now}
                    userId={user?._id}
                    isDoctor={isDoctor}
                    onApprove={handleApprove}
                    approving={approving}
                  />
                ))}
              </div>
            )
          }

          {/* ── History Toggle Button ── */}
          <div style={{ marginTop: 12, marginBottom: 12 }}>
            <button
              onClick={() => setShowHistory(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: showHistory ? '#1e293b' : '#f1f5f9',
                color: showHistory ? '#fff' : '#475569',
                border: 'none', borderRadius: 12, padding: '10px 20px',
                fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <span>{showHistory ? '▲' : '▼'}</span>
              {showHistory ? 'Hide' : 'Show'} History ({history.length})
            </button>
          </div>

          {/* ── History Section ── */}
          {showHistory && (
            <div style={{ marginTop: 8 }}>
              <SectionHeader
                title="Past Appointments"
                count={history.length}
                accent="#64748b"
              />
              {history.length === 0
                ? <EmptyState text="No past appointments yet." />
                : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                    {history.map(a => (
                      <AppointmentCard
                        key={a._id}
                        appt={a}
                        now={now}
                        userId={user?._id}
                        isDoctor={isDoctor}
                        onApprove={handleApprove}
                        approving={approving}
                      />
                    ))}
                  </div>
                )
              }
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}

function SectionHeader({ title, count, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <span style={{ width: 4, height: 24, background: accent, borderRadius: 4, display: 'inline-block' }} />
      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
        {title}
      </h3>
      <span style={{
        background: accent + '18', color: accent,
        borderRadius: 999, padding: '2px 10px', fontSize: '0.8rem', fontWeight: 700
      }}>{count}</span>
    </div>
  );
}
