import { FaCalendarAlt, FaRupeeSign, FaUserMd, FaUsers } from 'react-icons/fa';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import StatCard from '../components/StatCard.jsx';
import { useFetch } from '../hooks/useFetch.js';

export default function AdminDashboard() {
  const { data } = useFetch('/admin/stats', {});
  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <StatCard title="Total users" value={data.users || 0} icon={FaUsers} />
        <StatCard title="Doctors" value={data.doctors || 0} icon={FaUserMd} />
        <StatCard title="Appointments" value={data.appointments || 0} icon={FaCalendarAlt} />
        <StatCard title="Revenue" value={`₹${data.revenue || 0}`} icon={FaRupeeSign} />
      </div>
      <div className="card mt-6 p-6"><h2 className="font-semibold">System monitoring</h2><p className="mt-2 text-sm text-slate-500">Doctor approvals, blocked users, medicine inventory, payments, and report moderation are available through admin APIs.</p></div>
    </DashboardLayout>
  );
}
