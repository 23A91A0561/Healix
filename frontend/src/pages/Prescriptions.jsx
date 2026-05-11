import DashboardLayout from '../layouts/DashboardLayout.jsx';
import DataTable from '../components/DataTable.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { useAuth } from '../context/AuthContext.jsx';
import PatientPrescriptions from './patient/Prescriptions.jsx';
import api from '../services/api.js';

function DoctorPrescriptions() {
  const { data } = useFetch('/prescriptions');

  const handleDownload = async (id) => {
    try {
      const response = await api.get(`/prescriptions/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `prescription-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again later.');
    }
  };

  return <DashboardLayout><h1 className="text-3xl font-bold">Prescriptions</h1><div className="mt-6"><DataTable columns={[{ key: 'doctor', label: 'Doctor', render: (r) => r.doctor?.name }, { key: 'diagnosis', label: 'Diagnosis' }, { key: 'createdAt', label: 'Date', render: (r) => new Date(r.createdAt).toLocaleDateString() }, { key: 'download', label: 'PDF', render: (r) => <button className="text-primary font-medium hover:underline" onClick={() => handleDownload(r._id)}>Download</button> }]} rows={data} /></div></DashboardLayout>;
}

export default function Prescriptions() {
  const { user } = useAuth();
  if (user?.role === 'patient') return <PatientPrescriptions />;
  return <DoctorPrescriptions />;
}
