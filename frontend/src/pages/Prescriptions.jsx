import DashboardLayout from '../layouts/DashboardLayout.jsx';
import DataTable from '../components/DataTable.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import PatientPrescriptions from './patient/Prescriptions.jsx';

function DoctorPrescriptions() {
  const { data } = useFetch('/prescriptions');
  return <DashboardLayout><h1 className="text-3xl font-bold">Prescriptions</h1><div className="mt-6"><DataTable columns={[{ key: 'doctor', label: 'Doctor', render: (r) => r.doctor?.name }, { key: 'diagnosis', label: 'Diagnosis' }, { key: 'createdAt', label: 'Date', render: (r) => new Date(r.createdAt).toLocaleDateString() }, { key: 'download', label: 'PDF', render: (r) => <a className="text-primary" href={`${import.meta.env.VITE_API_URL}/prescriptions/${r._id}/pdf`}>Download</a> }]} rows={data} /></div></DashboardLayout>;
}

export default function Prescriptions() {
  const { user } = useAuth();
  if (user?.role === 'patient') return <PatientPrescriptions />;
  return <DoctorPrescriptions />;
}
