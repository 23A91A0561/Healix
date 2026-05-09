import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import DataTable from '../components/DataTable.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';

export default function Appointments() {
  const { user } = useAuth();
  const { data } = useFetch('/appointments');
  const now = Date.now();

  const activeAppointments = useMemo(() => data.filter((appointment) => {
    const start = new Date(appointment.scheduledAt).getTime();
    const end = start + (appointment.durationMinutes || 30) * 60 * 1000;
    return end >= now;
  }), [data, now]);

  const isLive = (appointment) => {
    const start = new Date(appointment.scheduledAt).getTime();
    const end = start + (appointment.durationMinutes || 30) * 60 * 1000;
    return appointment.status !== 'cancelled' && now >= start && now <= end;
  };

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold">Appointments</h1>
      <div className="mt-6">
        <DataTable
          columns={[
            { key: 'doctor', label: 'Doctor', render: (r) => r.doctor?.name },
            { key: 'patient', label: 'Patient', render: (r) => r.patient?.name },
            { key: 'scheduledAt', label: 'Time', render: (r) => new Date(r.scheduledAt).toLocaleString() },
            { key: 'status', label: 'Status' },
            { key: 'payment', label: 'Payment', render: (r) => r.payment ? `${r.payment.status} (${r.payment.currency || 'INR'} ${r.payment.amount})` : '-' },
            {
              key: 'session',
              label: 'Session',
              render: (appointment) => {
                const live = isLive(appointment);
                const canJoin = live && (appointment.patient?._id === user?._id || appointment.doctor?._id === user?._id);
                return canJoin ? <Link className="btn-primary" to={`/consultation/${appointment._id}/${appointment.consultationRoom}`}>Join Session</Link> : <span className="text-slate-400">{live ? 'Waiting for join' : '-'}</span>;
              }
            }
          ]}
          rows={activeAppointments}
        />
      </div>
    </DashboardLayout>
  );
}
