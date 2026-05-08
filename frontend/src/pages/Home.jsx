import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar.jsx';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <section className="bg-[linear-gradient(135deg,#eaf3ff,#ffffff_55%,#e8fff6)]">
        <div className="mx-auto grid min-h-[78vh] max-w-7xl items-center gap-10 px-4 py-16 lg:grid-cols-[1.1fr_.9fr]">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="max-w-3xl text-4xl font-bold tracking-normal text-slate-950 md:text-6xl">Smart Digital Healthcare Platform</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">Book trusted doctors, join secure video consultations, manage prescriptions, track reminders, upload reports, and coordinate care in one modern clinical workspace.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="btn-primary" to="/register">Create account</Link>
              <Link className="btn-light" to="/doctors">Find doctors</Link>
            </div>
          </motion.div>
          <div className="card grid gap-4 p-5">
            {['Live queue updates', 'Secure video consultation', 'Digital prescription PDFs', 'Medicine and lab workflows'].map((item) => <div className="rounded-md bg-slate-50 p-4 font-medium text-slate-700" key={item}>{item}</div>)}
          </div>
        </div>
      </section>
    </div>
  );
}
