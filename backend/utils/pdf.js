import PDFDocument from 'pdfkit';

export function createPrescriptionPdf(prescription) {
  const doc = new PDFDocument({ margin: 48 });
  doc.fontSize(20).text('Smart Digital Healthcare Platform', { align: 'center' });
  doc.moveDown().fontSize(16).text('Digital Prescription');
  doc.moveDown().fontSize(11).text(`Patient: ${prescription.patient?.name || prescription.patient}`);
  doc.text(`Doctor: ${prescription.doctor?.name || prescription.doctor}`);
  doc.text(`Date: ${new Date(prescription.createdAt).toLocaleDateString()}`);
  doc.moveDown().fontSize(13).text('Medicines');
  prescription.medicines.forEach((med, index) => {
    doc.fontSize(11).text(`${index + 1}. ${med.name} - ${med.dosage}, ${med.frequency}, ${med.duration}`);
    if (med.notes) doc.text(`   Notes: ${med.notes}`);
  });
  if (prescription.notes) doc.moveDown().text(`Doctor notes: ${prescription.notes}`);
  doc.moveDown().fontSize(9).text('This prescription is generated digitally and should be used with professional medical guidance.');
  doc.end();
  return doc;
}
