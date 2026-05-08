import DashboardLayout from '../layouts/DashboardLayout.jsx';
import { useFetch } from '../hooks/useFetch.js';
export default function Notifications() { const { data } = useFetch('/notifications'); return <DashboardLayout><h1 className="text-3xl font-bold">Notifications</h1><div className="mt-6 space-y-3">{data.map((n) => <div className="card p-4" key={n._id}><h2 className="font-semibold">{n.title}</h2><p className="text-sm text-slate-500">{n.message}</p></div>)}</div></DashboardLayout>; }
