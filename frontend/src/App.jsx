import { Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Doctors from './pages/Doctors.jsx';
import Emergency from './pages/Emergency.jsx';
import Labs from './pages/Labs.jsx';
import BookingSuccess from './pages/BookingSuccess.jsx';
import PatientDashboard from './dashboard/PatientDashboard.jsx';
import DoctorDashboard from './dashboard/DoctorDashboard.jsx';
import AdminDashboard from './dashboard/AdminDashboard.jsx';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import Appointments from './pages/Appointments.jsx';
import Prescriptions from './pages/Prescriptions.jsx';
import VideoConsultation from './pages/VideoConsultation.jsx';
import Assistant from './pages/Assistant.jsx';
import Orders from './pages/Orders.jsx';
import Notifications from './pages/Notifications.jsx';
import HealthForm from './pages/HealthForm.jsx';

const protectedPage = (children, roles) => <ProtectedRoute roles={roles}>{children}</ProtectedRoute>;

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/doctors" element={protectedPage(<Doctors />)} />
      <Route path="/booking-success" element={protectedPage(<BookingSuccess />)} />
      <Route path="/labs" element={protectedPage(<Labs />)} />
      <Route path="/emergency" element={<Emergency />} />
      <Route path="/patient" element={protectedPage(<PatientDashboard />, ['patient'])} />
      <Route path="/doctor" element={protectedPage(<DoctorDashboard />, ['doctor'])} />
      <Route path="/admin" element={protectedPage(<AdminDashboard />, ['admin'])} />
      <Route path="/appointments" element={protectedPage(<Appointments />)} />
      <Route path="/health-form" element={protectedPage(<HealthForm />, ['patient'])} />
      <Route path="/prescriptions" element={protectedPage(<Prescriptions />)} />
      <Route path="/consultation/:appointmentId/:roomId" element={protectedPage(<VideoConsultation />, ['doctor', 'patient'])} />
      <Route path="/assistant" element={protectedPage(<Assistant />, ['patient'])} />
      <Route path="/orders" element={protectedPage(<Orders />, ['patient'])} />
      <Route path="/notifications" element={protectedPage(<Notifications />)} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
