import { NavLink } from 'react-router-dom';
import { FaCalendarCheck, FaChartLine, FaComments, FaFileMedical, FaPills, FaUserMd, FaVideo } from 'react-icons/fa';

const links = {
  patient: [['Dashboard', '/patient', FaChartLine], ['Doctors', '/doctors', FaUserMd], ['Appointments', '/appointments', FaCalendarCheck], ['Prescriptions', '/prescriptions', FaFileMedical], ['Cure AI', '/assistant', FaComments]],
  doctor: [['Dashboard', '/doctor', FaChartLine], ['Appointments', '/appointments', FaCalendarCheck], ['Consultation', '/consultation/demo', FaVideo], ['Prescriptions', '/prescriptions', FaFileMedical]],
  admin: [['Dashboard', '/admin', FaChartLine], ['Doctors', '/doctors', FaUserMd], ['Appointments', '/appointments', FaCalendarCheck]]
};

export default function Sidebar({ role }) {
  return (
    <aside className="hidden w-64 border-r border-slate-200 bg-white p-4 md:block">
      <div className="mb-6 text-sm font-semibold uppercase tracking-wide text-slate-400">{role} workspace</div>
      <div className="space-y-1">
        {(links[role] || []).map(([label, to, Icon]) => (
          <NavLink key={to} to={to} className={({ isActive }) => `flex items-center gap-3 rounded-md px-3 py-2 text-sm ${isActive ? 'bg-blue-50 text-primary' : 'text-slate-600 hover:bg-slate-50'}`}>
            <Icon /> {label}
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
