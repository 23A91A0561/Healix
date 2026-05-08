import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCheckCircle } from 'react-icons/fa';
import Navbar from '../components/Navbar.jsx';

export default function BookingSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/appointments');
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="grid min-h-[calc(100vh-57px)] place-items-center p-4">
        <div className="text-center">
          <div className="inline-flex">
            <FaCheckCircle className="h-24 w-24 text-green-500" />
          </div>
          <h1 className="mt-6 text-4xl font-bold text-slate-900">Appointment Booked Successfully!</h1>
          <p className="mt-4 text-lg text-slate-600">
            Your appointment has been confirmed. You will be redirected to your appointments in a moment.
          </p>
          <div className="mt-8 space-y-3">
            <button onClick={() => navigate('/appointments')} className="btn-primary">
              View My Appointments
            </button>
            <button onClick={() => navigate('/doctors')} className="btn-light">
              Book Another Appointment
            </button>
          </div>
          <p className="mt-6 text-sm text-slate-500">Redirecting in 5 seconds...</p>
        </div>
      </div>
    </div>
  );
}
