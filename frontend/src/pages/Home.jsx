import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/pages/Home.css';
import '../styles/components/DoctorCard.css';
import Footer from '../components/Footer.jsx';

const doctors = [
  {
    id: 1,
    name: 'Aarav Mehta',
    specialty: 'Cardiology',
    experience: '12 years',
    rating: '4.9',
    image: 'https://images.unsplash.com/photo-1612531386530-97286d97c2d2?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 2,
    name: 'Nisha Reddy',
    specialty: 'Dermatology',
    experience: '9 years',
    rating: '4.8',
    image: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 3,
    name: 'Rahul Sinha',
    specialty: 'Neurology',
    experience: '11 years',
    rating: '4.9',
    image: 'https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=800&q=80'
  }
];

const testimonials = [
  {
    name: 'Priya K.',
    role: 'Patient',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    quote: 'Healix made it easy to consult a specialist within minutes and manage all my reports in one place.'
  },
  {
    name: 'Arjun M.',
    role: 'Caregiver',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    quote: 'From booking to follow-up, the complete flow is seamless and feels truly premium.'
  },
  {
    name: 'Dr. Kavya',
    role: 'Consultant',
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=200&q=80',
    quote: 'The dashboard helps me handle appointments and consultations smoothly every day.'
  }
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="home-page page-shell">
      <header className="home-nav">
        <div className="container home-nav-inner">
          <div className="home-logo">
            <span className="home-logo-mark">H</span>
            <div>
              <div>Healix</div>
              <small style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                Telehealth Platform
              </small>
            </div>
          </div>

          <nav className="home-nav-links">
            <a href="#features" className="home-nav-link">Features</a>
            <a href="#doctors" className="home-nav-link">Doctors</a>
            <a href="#testimonials" className="home-nav-link">Testimonials</a>
          </nav>

          <div className="home-nav-actions">
            <Link to="/login" className="btn btn-secondary">Login</Link>
            <Link to="/register" className="btn btn-primary">Register</Link>
            <button
              className="btn btn-secondary mobile-menu-btn"
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              Menu
            </button>
          </div>
        </div>

        {menuOpen ? (
          <div className="container" style={{ marginTop: 10 }}>
            <div className="card" style={{ padding: 14, display: 'grid', gap: 10 }}>
              <a href="#features" className="home-nav-link" onClick={() => setMenuOpen(false)}>Features</a>
              <a href="#doctors" className="home-nav-link" onClick={() => setMenuOpen(false)}>Doctors</a>
              <a href="#testimonials" className="home-nav-link" onClick={() => setMenuOpen(false)}>Testimonials</a>
            </div>
          </div>
        ) : null}
      </header>

      <section className="hero">
        <div className="container hero-grid">
          <div className="fade-in-up">
            <span className="badge" style={{ background: 'rgba(37,99,235,0.12)', color: 'var(--primary-blue)' }}>
              Trusted by 20K+ Patients
            </span>
            <h1 className="hero-title">Smart healthcare, seamless care, human-first experience.</h1>
            <p className="hero-copy">
              Healix brings consultations, appointments, prescriptions, and patient management into one polished platform inspired by world-class healthcare products.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary pulse-glow">Start Free</Link>
              <Link to="/login" className="btn btn-secondary">Book Consultation</Link>
            </div>
            <div className="hero-trust">
              <span>4.9 average rating</span>
              <span>|</span>
              <span>24/7 virtual support</span>
            </div>
          </div>

          <div className="hero-visual float-soft">
            <img
              src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80"
              alt="Healthcare consultation"
            />
            <div className="hero-floating">
              <strong style={{ display: 'block' }}>Live Consultation Active</strong>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Dr. Aarav with Patient | 18 min</span>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="features">
        <div className="container">
          <div className="section-head">
            <h2>Platform Features</h2>
            <p>Everything required for modern telemedicine workflows.</p>
          </div>

          <div className="grid-4">
            {[
              ['Online Consultation', 'Connect with specialists over secure video sessions in minutes.'],
              ['Appointment Booking', 'Smart scheduling with date and time slot management.'],
              ['Digital Prescriptions', 'Create and share prescriptions instantly with patients.'],
              ['Video Follow-ups', 'Run ongoing check-ins through a polished consultation workspace.']
            ].map(([title, copy]) => (
              <article className="feature-card" key={title}>
                <div className="feature-icon">+</div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="doctors" className="doctors">
        <div className="container">
          <div className="section-head">
            <h2>Top Doctors</h2>
            <p>Highly rated experts available for consultation.</p>
          </div>

          <div className="grid-3">
            {doctors.map((doctor) => (
              <article className="doctor-card" key={doctor.id}>
                <div className="doctor-image-wrap">
                  <img className="doctor-image" src={doctor.image} alt={doctor.name} />
                </div>
                <div className="doctor-body">
                  <h3 className="doctor-name">Dr. {doctor.name}</h3>
                  <p className="doctor-meta">{doctor.specialty}</p>
                  <p className="doctor-meta">Experience: {doctor.experience}</p>
                  <div className="doctor-rating">
                    <span>{doctor.rating}</span>
                    <span>*</span>
                    <span style={{ color: 'var(--success)', fontWeight: 700 }}>Available</span>
                  </div>
                  <div className="card-actions">
                    <Link to="/doctors" className="btn btn-secondary">View Profile</Link>
                    <Link to="/login" className="btn btn-primary">Book Appointment</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="testimonials" className="testimonials">
        <div className="container">
          <div className="section-head">
            <h2>What Patients Say</h2>
            <p>Trusted by families, patients, and doctors across regions.</p>
          </div>

          <div className="testimonial-track">
            <div className="testimonial-row">
              {[...testimonials, ...testimonials].map((item, index) => (
                <article className="testimonial-card" key={`${item.name}-${index}`}>
                  <div className="testimonial-head">
                    <img src={item.image} alt={item.name} className="testimonial-avatar" />
                    <div>
                      <p className="testimonial-name">{item.name}</p>
                      <p className="testimonial-role">{item.role} | 5 star rating</p>
                    </div>
                  </div>
                  <p className="testimonial-copy">{item.quote}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
