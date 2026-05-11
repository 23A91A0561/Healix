import { useMemo, useState } from 'react';
import { FaFileMedical, FaSearch } from 'react-icons/fa';
import PrescriptionPreviewCard from '../../components/patient/PrescriptionPreviewCard.jsx';
import PrescriptionViewerModal from '../../components/patient/PrescriptionViewerModal.jsx';
import MedicineExplanationModal from '../../components/patient/MedicineExplanationModal.jsx';
import DietPlanModal from '../../components/patient/DietPlanModal.jsx';
import DashboardLayout from '../../layouts/DashboardLayout.jsx';
import prescriptions from '../../static/prescriptions.js';

function prescriptionMatchesSearch(prescription, search) {
  const query = search.trim().toLowerCase();
  if (!query) return true;

  const medicines = Array.isArray(prescription.medicines)
    ? prescription.medicines.map((medicine) => medicine.name).join(' ')
    : prescription.medicines || '';

  return [
    prescription.doctor?.name,
    prescription.hospitalName,
    prescription.hospital,
    prescription.diagnosis,
    prescription.disease,
    medicines
  ].filter(Boolean).join(' ').toLowerCase().includes(query);
}

export default function PatientPrescriptions() {
  const [search, setSearch] = useState('');
  const [viewerPrescription, setViewerPrescription] = useState(null);
  const [explanationPrescription, setExplanationPrescription] = useState(null);
  const [dietPrescription, setDietPrescription] = useState(null);

  const filteredPrescriptions = useMemo(
    () => prescriptions.filter((prescription) => prescriptionMatchesSearch(prescription, search)),
    [prescriptions, search]
  );

  return (
    <DashboardLayout>
      <style>
        {`@keyframes modalIn { from { opacity: 0; transform: translateY(18px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }`}
      </style>

      <section className="overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-sky-600 via-blue-600 to-cyan-500 p-6 text-white shadow-2xl shadow-sky-100 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-sky-100">Patient prescriptions</p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">Your medical records, beautifully organized</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-sky-50 md:text-base">
              Open prescription documents, understand medicines with AI guidance, and get diet support in English, Telugu, or Hindi.
            </p>
          </div>

          <div className="rounded-2xl bg-white/15 p-4 text-center backdrop-blur">
            <p className="text-3xl font-bold">{prescriptions.length}</p>
            <p className="text-sm font-semibold text-sky-50">prescriptions</p>
          </div>
        </div>
      </section>

      <div className="mt-6 rounded-2xl border border-sky-100 bg-white/80 p-4 shadow-soft backdrop-blur">
        <label htmlFor="prescription-search" className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 focus-within:border-sky-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100">
          <FaSearch className="text-sky-500" />
          <input
            id="prescription-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by doctor, diagnosis, hospital, or medicine"
            className="w-full bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
          />
        </label>
      </div>

      {filteredPrescriptions.length > 0 ? (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredPrescriptions.map((prescription) => (
            <PrescriptionPreviewCard
              key={prescription._id || prescription.id}
              prescription={prescription}
              onView={() => setViewerPrescription(prescription)}
              onExplain={() => setExplanationPrescription(prescription)}
              onDietPlan={() => setDietPrescription(prescription)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-3xl border border-dashed border-sky-200 bg-white/80 p-10 text-center shadow-soft backdrop-blur">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-3xl text-sky-600">
            <FaFileMedical />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-slate-900">No prescriptions found</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Your uploaded prescription previews will appear here with doctor details, medicine counts, AI explanations, and diet plans.
          </p>
        </div>
      )}

      <PrescriptionViewerModal prescription={viewerPrescription} onClose={() => setViewerPrescription(null)} />
      <MedicineExplanationModal prescription={explanationPrescription} onClose={() => setExplanationPrescription(null)} />
      <DietPlanModal prescription={dietPrescription} onClose={() => setDietPrescription(null)} />
    </DashboardLayout>
  );
}
