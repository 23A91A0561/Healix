import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import api from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import '../styles/pages/Dashboard.css';
import '../styles/pages/Booking.css';

function formatDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function formatDisplayDate(date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPrice(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
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
  const [filters, setFilters] = useState({ q: '', specialization: '', rating: '', language: '' });
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
  const { data: allDoctors } = useFetch('/doctors');
  const doctors = data || [];
  const specializations = useMemo(() => {
    const list = (allDoctors || data || []).map((d) => d.specialization).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [allDoctors, data]);
  const languages = useMemo(() => {
    const list = (allDoctors || data || []).flatMap((doctor) => doctor.languages || []).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [allDoctors, data]);

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
    <div className="dashboard-page">
      <Navbar />
      <main className="dashboard-content">
        <section className="dashboard-hero">
          <div className="dashboard-hero-head">
            <div>
              <p className="badge" style={{ margin: 0, background: 'rgba(37,99,235,0.12)', color: 'var(--primary-blue)' }}>
                Directory
              </p>
              <h1>Find Doctors</h1>
              <p>Search specialists, compare consultation prices, and book appointments with the right doctor.</p>
            </div>
          </div>
        </section>

        <section className="filters-panel filters-panel-quad">
          <div className="input-shell">
            <label htmlFor="doctor-search">Search doctors</label>
            <input
              id="doctor-search"
              type="search"
              placeholder="Name, qualification, or clinic"
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            />
          </div>

          <div className="input-shell">
            <label htmlFor="doctor-specialization">Specialization</label>
            <select
              id="doctor-specialization"
              value={filters.specialization}
              onChange={(e) => setFilters({ ...filters, specialization: e.target.value })}
            >
              <option value="">All specializations</option>
              {specializations.map((specialization) => (
                <option key={specialization} value={specialization}>{specialization}</option>
              ))}
            </select>
          </div>

          <div className="input-shell">
            <label htmlFor="doctor-rating">Rating</label>
            <select
              id="doctor-rating"
              value={filters.rating}
              onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
            >
              <option value="">Any rating</option>
              <option value="5">5+ stars</option>
              <option value="4">4+ stars</option>
              <option value="3">3+ stars</option>
            </select>
          </div>

          <div className="input-shell">
            <label htmlFor="doctor-language">Language</label>
            <select
              id="doctor-language"
              value={filters.language}
              onChange={(e) => setFilters({ ...filters, language: e.target.value })}
            >
              <option value="">Any language</option>
              {languages.map((language) => (
                <option key={language} value={language}>{language}</option>
              ))}
            </select>
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Available doctors</h2>
              <p>Browse providers and choose an appointment slot.</p>
            </div>
          </div>

          <div className="doctor-grid">
            {doctors.length ? doctors.map((doctor) => {
              const isSelected = selectedDoctor?.user?._id === doctor.user?._id;
              return (
                <article className="profile-card" key={doctor._id} style={{ overflow: 'visible' }}>
                  <div className="profile-body">
                    <div className="navbar-brand" style={{ alignItems: 'center' }}>
                      <span className="navbar-logo">{doctor.user?.name?.charAt(0) || 'D'}</span>
                      <span>
                        <strong>{doctor.user?.name}</strong>
                        <small style={{ color: 'var(--text-muted)', display: 'block', fontWeight: 600 }}>
                          {doctor.qualification || doctor.specialization || 'Healthcare specialist'}
                        </small>
                      </span>
                    </div>

                    <div className="info-list">
                      <div className="info-item"><strong>{doctor.specialization}</strong><span>Specialization</span></div>
                      <div className="info-item"><strong>{doctor.experienceYears || 0} years</strong><span>Experience</span></div>
                      <div className="info-item"><strong>{formatPrice(doctor.consultationFee)}</strong><span>Consultation price</span></div>
                      <div className="info-item"><strong>{doctor.rating?.average || 0}</strong><span>Rating</span></div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDoctor(doctor);
                        setSelectedDate(formatDateInput(new Date()));
                      }}
                      className="btn btn-primary"
                      style={{ marginTop: 16, width: '100%' }}
                    >
                      Book slot
                    </button>

                    {isSelected ? (
                      <div className="booking-summary">
                        <p style={{ fontWeight: 700, margin: 0 }}>Select a date</p>
                        <div className="slot-grid">
                          {getNextSevenDays().map((date) => {
                            const value = formatDateInput(date);
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => setSelectedDate(value)}
                                className={`slot-btn ${selectedDate === value ? 'active' : ''}`}
                              >
                                {formatDisplayDate(date)}
                              </button>
                            );
                          })}
                        </div>

                        <div style={{ marginTop: 16 }}>
                          <p style={{ fontWeight: 700, margin: 0 }}>Available 30-minute slots</p>
                          {bookingError ? <p style={{ color: 'var(--danger)' }}>{bookingError}</p> : null}
                          {loadingAvailability ? (
                            <p style={{ color: 'var(--text-muted)' }}>Checking availability...</p>
                          ) : schedule.length ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                              Doctor schedule: {schedule.map((slot) => `${slot.day} ${slot.start}-${slot.end}`).join(', ')}
                            </p>
                          ) : null}

                          <div className="slot-grid">
                            {availability.map((slot) => (
                              <button
                                key={`${slot.start}-${slot.end}`}
                                type="button"
                                onClick={() => setSelectedSlot(slot)}
                                className={`slot-btn ${selectedSlot?.start === slot.start ? 'active' : ''}`}
                              >
                                {slot.start} - {slot.end}
                              </button>
                            ))}
                          </div>

                          {!loadingAvailability && selectedDate && !availability.length && !bookingError ? (
                            <p style={{ color: 'var(--text-muted)' }}>No free slots found for the selected day.</p>
                          ) : null}

                          <button
                            type="button"
                            onClick={confirmBooking}
                            disabled={!selectedSlot || paymentProcessing}
                            className="btn btn-primary"
                            style={{ marginTop: 16, width: '100%' }}
                          >
                            {paymentProcessing ? 'Creating payment order...' : 'Continue to payment'}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            }) : (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                <h3>No doctors found</h3>
                <p>Adjust your search or filters to discover more doctors.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {pendingBooking ? (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="panel-head">
              <div>
                <p className="badge" style={{ margin: 0, background: 'rgba(37,99,235,0.12)', color: 'var(--primary-blue)' }}>
                  Razorpay test payment
                </p>
                <h2 style={{ marginTop: 10 }}>Pay consultation fee</h2>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => setPendingBooking(null)}>
                Close
              </button>
            </div>

            <div className="booking-summary">
              <p><strong>Doctor:</strong> {selectedDoctor?.user?.name}</p>
              <p><strong>Amount:</strong> {formatPrice(pendingBooking.payment?.amount)}</p>
              <p><strong>Order:</strong> {pendingBooking.razorpay.orderId}</p>
            </div>

            <div className="slot-grid">
              {paymentOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setPaymentMethod(option.id)}
                  className={`slot-btn ${paymentMethod === option.id ? 'active' : ''}`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {paymentMethod === 'upi' ? (
              <div className="field" style={{ marginTop: 16 }}>
                <label>Choose UPI app</label>
                <div className="slot-grid">
                  {upiApps.map((app) => (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => setUpiApp(app.id)}
                      className={`slot-btn ${upiApp === app.id ? 'active' : ''}`}
                    >
                      {app.label}
                    </button>
                  ))}
                </div>
                <input style={{ marginTop: 12 }} value={`${user?.name || 'patient'}@upi`} readOnly />
              </div>
            ) : null}

            {paymentMethod === 'card' ? (
              <div className="auth-form">
                <div className="field">
                  <label>Card number</label>
                  <input value={cardDetails.number} onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })} />
                </div>
                <div className="field">
                  <label>Name on card</label>
                  <input value={cardDetails.name || user?.name || ''} onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })} />
                </div>
                <div className="auth-inline-grid">
                  <div className="field">
                    <label>MM/YY</label>
                    <input value={cardDetails.expiry} onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })} />
                  </div>
                  <div className="field">
                    <label>CVV</label>
                    <input value={cardDetails.cvv} onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })} />
                  </div>
                </div>
              </div>
            ) : null}

            {paymentMethod === 'netbanking' ? (
              <div className="field" style={{ marginTop: 16 }}>
                <label>Bank</label>
                <select defaultValue="sbi">
                  <option value="sbi">State Bank of India</option>
                  <option value="hdfc">HDFC Bank</option>
                  <option value="icici">ICICI Bank</option>
                  <option value="axis">Axis Bank</option>
                </select>
              </div>
            ) : null}

            {bookingError ? <p style={{ color: 'var(--danger)' }}>{bookingError}</p> : null}

            <button
              type="button"
              onClick={completePayment}
              disabled={paymentProcessing}
              className="btn btn-primary"
              style={{ marginTop: 16, width: '100%' }}
            >
              {paymentProcessing ? 'Processing payment...' : pendingBooking.razorpay.keyId ? 'Continue to Razorpay' : `Pay ${formatPrice(pendingBooking.payment?.amount)}`}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
