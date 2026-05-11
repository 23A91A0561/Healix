import { FaFilePdf, FaHospital, FaNotesMedical, FaTimes, FaUserInjured, FaUserMd } from 'react-icons/fa';

function asMedicineList(medicines) {
  if (Array.isArray(medicines)) return medicines;
  if (typeof medicines === 'string') {
    return medicines
      .split(/\n|,/)
      .map((name) => name.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
  }
  return [];
}

function formatDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export default function PrescriptionViewerModal({ prescription, onClose }) {
  if (!prescription) return null;

  const medicines = asMedicineList(prescription.medicines);
  const documentUrl = prescription.uploadedFile || prescription.documentUrl || prescription.imageUrl || prescription.pdfUrl;
  const hospitalName = prescription.doctor?.hospital || prescription.hospitalName || prescription.hospital || 'Healix Medical Center';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl animate-[modalIn_0.22s_ease-out]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-sky-50 to-white p-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-sky-600">Digital Prescription</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">{hospitalName}</h2>
            <p className="mt-1 text-sm text-slate-500">Uploaded on {formatDate(prescription.createdAt || prescription.uploadedAt)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full bg-white p-3 text-slate-500 shadow-sm transition hover:bg-slate-100 hover:text-slate-900">
            <FaTimes />
          </button>
        </div>

        <div className="max-h-[calc(92vh-94px)] overflow-y-auto p-5">
          <section className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
                <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-sky-700">
                  <FaUserInjured />
                  Patient Details
                </p>
                <h3 className="mt-3 text-lg font-bold text-slate-900">{prescription.patient?.name || 'Patient'}</h3>
                <p className="text-sm text-slate-600">{prescription.patient?.email || 'Email not available'}</p>
                {prescription.patient?.age && <p className="text-sm text-slate-600">Age: {prescription.patient.age}</p>}
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-blue-700">
                  <FaUserMd />
                  Doctor Details
                </p>
                <h3 className="mt-3 text-lg font-bold text-slate-900">Dr. {(prescription.doctor?.name || 'Healix Doctor').replace(/^Dr\.\s*/i, '')}</h3>
                <p className="flex items-center gap-2 text-sm text-slate-600">
                  <FaHospital className="text-blue-500" />
                  {hospitalName}
                </p>
                <p className="text-sm text-slate-600">{prescription.doctor?.email || 'Verified Healix provider'}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
                <FaNotesMedical className="text-sky-500" />
                Diagnosis
              </p>
              <p className="mt-2 text-slate-800">{prescription.diagnosis || prescription.disease || 'General consultation'}</p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Main Complaint</h3>
              <p className="mt-2 whitespace-pre-wrap text-slate-700">{prescription.mainComplaint || 'Not provided.'}</p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Complaint Description</h3>
              <p className="mt-2 whitespace-pre-wrap text-slate-700">{prescription.complaintDescription || 'Not provided.'}</p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Medicines & Dosage</h3>
              <div className="mt-4 space-y-3">
                {medicines.length ? medicines.map((medicine, index) => (
                  <div key={`${medicine.name}-${index}`} className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-bold text-slate-900">{medicine.name || `Medicine ${index + 1}`}</p>
                    <div className="mt-2 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <span>Dosage: {medicine.dosage || prescription.dosage || 'As prescribed'}</span>
                      <span>Frequency: {medicine.frequency || 'Follow doctor advice'}</span>
                      <span>Timing: {medicine.timing || 'As directed'}</span>
                      <span>Duration: {medicine.duration || (medicine.days ? `${medicine.days} days` : 'As directed')}</span>
                    </div>
                    {medicine.notes && <p className="mt-2 text-sm text-slate-500">{medicine.notes}</p>}
                  </div>
                )) : (
                  <p className="text-sm text-slate-500">No medicines were attached to this prescription.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Suggestions / Special Instructions</h3>
              <p className="mt-2 whitespace-pre-wrap text-slate-700">{prescription.suggestions || prescription.notes || 'No additional notes.'}</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
