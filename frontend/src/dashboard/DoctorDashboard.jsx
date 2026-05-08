import { useEffect, useMemo, useState } from 'react';
import { FaCalendarCheck, FaChartLine, FaFilePrescription, FaRupeeSign } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import StatCard from '../components/StatCard.jsx';
import DataTable from '../components/DataTable.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { socket } from '../services/socket.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const { data } = useFetch('/appointments');
  const [sessionNotice, setSessionNotice] = useState(null);

  useEffect(() => {
    if (!user) return;
    const onPatientJoining = (payload) => {
      setSessionNotice(payload);
    };
    const onSessionStatus = (payload) => {
      setSessionNotice((current) => current?.appointment === payload.appointment ? { ...current, status: payload.status } : current);
    };

    socket.on('session:patient-joining', onPatientJoining);
    socket.on('session:status', onSessionStatus);
    return () => {
      socket.off('session:patient-joining', onPatientJoining);
      socket.off('session:status', onSessionStatus);
    };
  }, [user]);

  const liveAppointments = useMemo(() => data.filter((appointment) => {
    const start = new Date(appointment.scheduledAt).getTime();
    const end = start + (appointment.durationMinutes || 30) * 60 * 1000;
    const now = Date.now();
    return appointment.status !== 'cancelled' && now >= start && now <= end;
  }), [data]);

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold">Doctor Dashboard</h1>
      {sessionNotice && (
        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <div className="font-semibold">Patient is joining the session</div>
          <div className="mt-1">{sessionNotice.patientName || 'A patient'} is waiting in appointment {sessionNotice.appointment}.</div>
          <Link className="btn-primary mt-3" to={`/consultation/${sessionNotice.appointment}`}>Connect now</Link>
        </div>
      )}
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatCard title="Live sessions" value={liveAppointments.length} icon={FaCalendarCheck} />
        <StatCard title="Earnings" value="₹24k" icon={FaRupeeSign} />
        <StatCard title="Prescriptions" value="38" icon={FaFilePrescription} />
        <StatCard title="Rating" value="4.8" icon={FaChartLine} />
      </div>
      <div className="mt-6"><DataTable columns={[{ key: 'patient', label: 'Patient', render: (r) => r.patient?.name }, { key: 'scheduledAt', label: 'Date', render: (r) => new Date(r.scheduledAt).toLocaleString() }, { key: 'status', label: 'Status' }, { key: 'session', label: 'Session', render: (appointment) => {
        const start = new Date(appointment.scheduledAt).getTime();
        const end = start + (appointment.durationMinutes || 30) * 60 * 1000;
        const live = appointment.status !== 'cancelled' && Date.now() >= start && Date.now() <= end;
        return live ? <Link className="btn-light" to={`/consultation/${appointment._id}`}>Join Session</Link> : <span className="text-slate-400">-</span>;
      } }]} rows={data} /></div>
    </DashboardLayout>
  );
}
