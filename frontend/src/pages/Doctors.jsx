import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';

function formatDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function getNextSevenDays() {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let index = 0; index < 7; index += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    days.push(date);
  }
  return days;
}

function loadRazorpayCheckout() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existingScript) {
      existingScript.addEventListener('load', resolve, { once: true });
      existingScript.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Unable to load Razorpay Checkout'));
    document.body.appendChild(script);
  });
}

const paymentOptions = [
  { id: 'upi', label: 'UPI' },
  { id: 'card', label: 'Card' },
  { id: 'netbanking', label: 'Net banking' }
];

const upiApps = [
  { id: 'gpay', label: 'Google Pay' },
  { id: 'phonepe', label: 'PhonePe' },
  { id: 'paytm', label: 'Paytm' }
];

export default function Doctors() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filters, setFilters] = useState({ q: '', specialization: '', rating: '', experience: '' });
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [availability, setAvailability] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [upiApp, setUpiApp] = useState('gpay');
  const [cardDetails, setCardDetails] = useState({ number: '4111 1111 1111 1111', name: '', expiry: '12/30', cvv: '123' });
  const [bookingError, setBookingError] = useState('');
  const query = useMemo(() => new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString(), [filters]);
  const { data } = useFetch(`/doctors?${query}`);

  useEffect(() => {
    async function loadAvailability() {
      if (!selectedDoctor || !selectedDate) return;
      setLoadingAvailability(true);
      setBookingError('');
      try {
        const { data: response } = await api.get(`/doctors/${selectedDoctor.user._id}/availability`, { params: { date: selectedDate } });
        setAvailability(response.availability || []);
        setSchedule(response.schedule || []);
        setSelectedSlot(null);
      } catch (error) {
        setAvailability([]);
        setSchedule([]);
        setBookingError(error.response?.data?.message || error.message);
      } finally {
        setLoadingAvailability(false);
      }
    }
    loadAvailability();
  }, [selectedDoctor, selectedDate]);

  function resetBookingFlow() {
    setSelectedDoctor(null);
    setSelectedDate('');
    setAvailability([]);
    setSchedule([]);
    setSelectedSlot(null);
    setPendingBooking(null);
    setBookingError('');
  }

  async function confirmBooking() {
    if (!selectedDoctor || !selectedDate || !selectedSlot) return;
    setPaymentProcessing(true);
    setBookingError('');
    try {
      const scheduledAt = new Date(`${selectedDate}T${selectedSlot.start}:00`).toISOString();
      const { data: booking } = await api.post('/appointments', {
        doctor: selectedDoctor.user._id,
        scheduledAt,
        amount: selectedDoctor.consultationFee
      });

      if (!booking.razorpay) {
        navigate('/booking-success');
        return;
      }

      setPendingBooking(booking);
    } catch (error) {
      setBookingError(error.response?.data?.message || error.message);
    } finally {
      setPaymentProcessing(false);
    }
  }

  async function completePayment() {
    if (!pendingBooking) return;
    setPaymentProcessing(true);
    setBookingError('');
    try {
      if (!pendingBooking.razorpay.keyId) {
        await api.post(`/appointments/${pendingBooking.appointment._id}/payment/verify`, {
          razorpay_order_id: pendingBooking.razorpay.orderId,
          razorpay_payment_id: `mock_${paymentMethod}_${Date.now()}`,
          razorpay_signature: 'mock_signature'
        });
        navigate('/booking-success');
        return;
      }

      await loadRazorpayCheckout();
      const options = {
        key: pendingBooking.razorpay.keyId,
        amount: pendingBooking.razorpay.amount,
        currency: pendingBooking.razorpay.currency,
        name: 'Healix',
        description: `Consultation with Dr. ${selectedDoctor.user?.name || 'Doctor'}`,
        order_id: pendingBooking.razorpay.orderId,
        handler: async (response) => {
          await api.post(`/appointments/${pendingBooking.appointment._id}/payment/verify`, response);
          navigate('/booking-success');
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          method: paymentMethod
        },
        theme: { color: '#2563eb' },
        modal: {
          ondismiss: () => setBookingError('Payment was cancelled. The appointment is pending and will be confirmed after payment.')
        }
      };
      new window.Razorpay(options).open();
    } catch (error) {
      setBookingError(error.response?.data?.message || error.message);
    } finally {
      setPaymentProcessing(false);
    }
  }

  return (
    <div><Navbar /><main className="mx-auto max-w-7xl p-4 md:p-8">
      <h1 className="text-3xl font-bold">Find doctors</h1>
      <div className="mt-6 grid gap-3 md:grid-cols-4">
        {['q', 'specialization', 'rating', 'experience'].map((key) => <input key={key} className="input" placeholder={key} value={filters[key]} onChange={(e) => setFilters({ ...filters, [key]: e.target.value })} />)}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map((doctor) => <article className="card p-5" key={doctor._id}>
          <div className="flex items-center gap-4"><div className="grid h-14 w-14 place-items-center rounded-full bg-blue-50 font-bold text-primary">{doctor.user?.name?.[0]}</div><div><h2 className="font-bold">{doctor.user?.name}</h2><p className="text-sm text-slate-500">{doctor.qualification}</p></div></div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600"><p>{doctor.specialization}</p><p>{doctor.experienceYears} yrs exp</p><p>₹{doctor.consultationFee}</p><p>{doctor.rating?.average || 0} rating</p></div>
          <button onClick={() => { setSelectedDoctor(doctor); setSelectedDate(formatDateInput(new Date())); }} className="btn-primary mt-5 w-full">Book slot</button>
          {selectedDoctor?.user?._id === doctor.user?._id && (
            <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-700">Select a date</p>
              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                {getNextSevenDays().map((date) => {
                  const value = formatDateInput(date);
                  const active = selectedDate === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSelectedDate(value)}
                      className={`rounded-md border px-3 py-2 text-center text-sm ${active ? 'border-primary bg-blue-50 text-primary' : 'border-slate-200 bg-white text-slate-700'}`}
                    >
                      <div className="font-semibold">{formatDisplayDate(date)}</div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4">
                <p className="text-sm font-semibold text-slate-700">Available 30-minute slots</p>
                {bookingError && <p className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-700">{bookingError}</p>}
                {loadingAvailability ? (
                  <p className="mt-3 text-sm text-slate-500">Checking availability...</p>
                ) : schedule.length ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Doctor schedule: {schedule.map((slot) => `${slot.day} ${slot.start}-${slot.end}`).join(', ')}
                  </p>
                ) : null}
                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                  {availability.map((slot) => {
                    const active = selectedSlot?.start === slot.start;
                    return (
                      <button
                        key={`${slot.start}-${slot.end}`}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`rounded-md border px-3 py-2 text-sm ${active ? 'border-primary bg-blue-50 text-primary' : 'border-slate-200 bg-white text-slate-700'}`}
                      >
                        {slot.start} - {slot.end}
                      </button>
                    );
                  })}
                </div>

                {!loadingAvailability && selectedDate && !availability.length && !bookingError && (
                  <p className="mt-3 text-sm text-slate-500">No free slots found for the selected day.</p>
                )}

                <button onClick={confirmBooking} disabled={!selectedSlot || paymentProcessing} className="btn-primary mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50">
                  {paymentProcessing ? 'Creating payment order...' : 'Continue to payment'}
                </button>
              </div>
            </div>
          )}
        </article>)}
      </div>
    </main>
    {pendingBooking && (
      <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4">
        <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
          <div className="border-b border-slate-200 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-primary">Razorpay test payment</p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">Pay consultation fee</h2>
              </div>
              <button
                type="button"
                onClick={() => setPendingBooking(null)}
                className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
            <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              <p><span className="font-semibold">Doctor:</span> {selectedDoctor?.user?.name}</p>
              <p><span className="font-semibold">Amount:</span> Rs. {pendingBooking.payment?.amount}</p>
              <p><span className="font-semibold">Order:</span> {pendingBooking.razorpay.orderId}</p>
            </div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-3 gap-2">
              {paymentOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPaymentMethod(option.id)}
                  className={`rounded-md border px-3 py-2 text-sm font-semibold ${paymentMethod === option.id ? 'border-primary bg-blue-50 text-primary' : 'border-slate-200 text-slate-600'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {paymentMethod === 'upi' && (
              <div className="mt-5">
                <p className="text-sm font-semibold text-slate-700">Choose UPI app</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {upiApps.map((app) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => setUpiApp(app.id)}
                      className={`rounded-md border px-3 py-3 text-sm ${upiApp === app.id ? 'border-primary bg-blue-50 text-primary' : 'border-slate-200 text-slate-600'}`}
                    >
                      {app.label}
                    </button>
                  ))}
                </div>
                <input className="input mt-3" value={`${user?.name || 'patient'}@upi`} readOnly />
              </div>
            )}

            {paymentMethod === 'card' && (
              <div className="mt-5 grid gap-3">
                <input
                  className="input"
                  placeholder="Card number"
                  value={cardDetails.number}
                  onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Name on card"
                  value={cardDetails.name || user?.name || ''}
                  onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="input"
                    placeholder="MM/YY"
                    value={cardDetails.expiry}
                    onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="CVV"
                    value={cardDetails.cvv}
                    onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'netbanking' && (
              <select className="input mt-5" defaultValue="sbi">
                <option value="sbi">State Bank of India</option>
                <option value="hdfc">HDFC Bank</option>
                <option value="icici">ICICI Bank</option>
                <option value="axis">Axis Bank</option>
              </select>
            )}

            {bookingError && <p className="mt-4 rounded-md bg-red-50 p-2 text-sm text-red-700">{bookingError}</p>}

            <button
              type="button"
              onClick={completePayment}
              disabled={paymentProcessing}
              className="btn-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50"
            >
              {paymentProcessing ? 'Processing payment...' : pendingBooking.razorpay.keyId ? 'Continue to Razorpay' : `Pay Rs. ${pendingBooking.payment?.amount}`}
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
