import { FaCalendarAlt, FaEye, FaFileMedical, FaHospital, FaNotesMedical, FaPills, FaUtensils } from 'react-icons/fa';

function getMedicineCount(medicines) {
  if (Array.isArray(medicines)) return medicines.length;
  if (typeof medicines === 'string') return medicines.split(/\n|,/).filter(Boolean).length;
  return 0;
}

function formatDate(date) {
  if (!date) return 'Recently uploaded';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export default function PrescriptionPreviewCard({ prescription, onView, onExplain, onDietPlan }) {
  const doctorName = prescription.doctor?.name || prescription.doctorName || 'Healix Doctor';
  const hospitalName = prescription.doctor?.hospital || prescription.hospitalName || prescription.hospital || 'Healix Medical Center';
  const diagnosis = prescription.diagnosis || prescription.disease || 'General consultation';
  const medicineCount = getMedicineCount(prescription.medicines);
  const previewUrl = prescription.previewUrl || prescription.uploadedFile || prescription.imageUrl || prescription.documentUrl || prescription.pdfUrl;

  return (
    <article className="group overflow-hidden rounded-2xl border border-white/80 bg-white/80 shadow-soft backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-sky-100">


      <div className="space-y-4 p-5">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Dr. {doctorName.replace(/^Dr\.\s*/i, '')}</h3>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <FaHospital className="text-sky-500" />
            {hospitalName}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-sky-50/80 p-3">
            <p className="flex items-center gap-2 font-semibold text-slate-500">
              <FaCalendarAlt className="text-sky-500" />
              Uploaded
            </p>
            <p className="mt-1 font-bold text-slate-800">{formatDate(prescription.createdAt || prescription.uploadedAt)}</p>
          </div>
          <div className="rounded-xl bg-blue-50/80 p-3">
            <p className="flex items-center gap-2 font-semibold text-slate-500">
              <FaNotesMedical className="text-blue-500" />
              Diagnosis
            </p>
            <p className="mt-1 truncate font-bold text-slate-800">{diagnosis}</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <button type="button" onClick={onView} className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-700">
            <FaEye />
            View
          </button>
          <button type="button" onClick={onExplain} className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-100 bg-white px-3 py-2 text-sm font-semibold text-sky-700 transition hover:border-sky-300 hover:bg-sky-50">
            <FaPills />
            Give Details
          </button>
          <button type="button" onClick={onDietPlan} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100">
            <FaUtensils />
            Diet Plan
          </button>
        </div>
      </div>
    </article>
  );
}
