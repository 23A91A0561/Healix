const prescriptions = [
  {
    _id: "RX001",
    id: "RX001",
    patient: {
      name: "Priya Sharma",
      email: "priya@gmail.com",
      age: 24
    },
    doctor: {
      name: "Dr. Availa Bell",
      hospital: "Healix Medical Center"
    },
    hospitalName: "Healix Medical Center",
    diagnosis: "Fever",
    mainComplaint: "High fever and headache",
    complaintDescription: "Patient has fever for 3 days with body pains and weakness.",
    medicines: [
      {
        name: "Dolo 650",
        dosage: "650mg",
        frequency: "Twice daily",
        timing: "After meals",
        duration: "5 days"
      },
      {
        name: "ORS Solution",
        dosage: "1 sachet in water",
        frequency: "Once daily",
        timing: "After lunch",
        duration: "3 days"
      }
    ],
    suggestions: "Drink warm water, take proper rest, avoid oily foods.",
    uploadedFile: "/sample-prescription.pdf",
    createdAt: "2026-05-10"
  }
];

export default prescriptions;
