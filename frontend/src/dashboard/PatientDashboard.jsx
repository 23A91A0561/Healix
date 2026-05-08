import { FaBell, FaCalendarAlt, FaFileMedical, FaHeartbeat, FaPills } from 'react-icons/fa';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import StatCard from '../components/StatCard.jsx';
import { useFetch } from '../hooks/useFetch.js';

export default function PatientDashboard() {
  const { data: appointments } = useFetch('/appointments');
  const chart = [{ day: 'Mon', bp: 118 }, { day: 'Tue', bp: 122 }, { day: 'Wed', bp: 120 }, { day: 'Thu', bp: 124 }];
  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold">Patient Dashboard</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Upcoming appointments" value={appointments.filter?.((a) => a.status !== 'completed').length || 0} icon={FaCalendarAlt} />
        <StatCard title="Medicine reminders" value="4" icon={FaPills} />
        <StatCard title="Reports uploaded" value="8" icon={FaFileMedical} />
        <StatCard title="Notifications" value="12" icon={FaBell} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_.6fr]">
        <div className="card p-5"><h2 className="font-semibold">Health stats</h2><div className="h-72"><ResponsiveContainer><AreaChart data={chart}><XAxis dataKey="day" /><YAxis /><Area dataKey="bp" stroke="#0f6fff" fill="#dbeafe" /></AreaChart></ResponsiveContainer></div></div>
        <div className="card p-5"><h2 className="font-semibold">Profile details</h2><p className="mt-4 text-sm text-slate-600">Keep your pre-consultation form updated before video calls.</p></div>
      </div>
    </DashboardLayout>
  );
}
