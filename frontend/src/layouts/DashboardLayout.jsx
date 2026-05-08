import Navbar from '../components/Navbar.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function DashboardLayout({ children }) {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="flex min-h-[calc(100vh-57px)]">
        <Sidebar role={user?.role} />
        <main className="w-full p-4 md:p-8">
          <div className="mb-6 rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-soft">
            <p className="text-sm font-medium uppercase tracking-wide text-slate-400">Dashboard</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Hi, {user?.name || 'there'}</h1>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
