# Smart Digital Healthcare Platform

A full-stack healthcare platform with multi-role authentication, appointments, real-time queue, video consultation signaling, prescriptions with PDF generation, reminders, medicine orders, lab tests, payments, notifications, dashboards, and an AI health assistant.

## Stack

- Frontend: React, React Router DOM, Tailwind CSS, Axios, Framer Motion, Socket.io Client, React Icons
- Backend: Node.js, Express, MongoDB, Mongoose, JWT, Socket.io, Multer, Cloudinary, PDFKit, Nodemailer, Node Cron
- Deployment: Vercel frontend, Render backend, MongoDB Atlas database

## Quick Start

```bash
npm install
npm run install:all
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm run seed
npm run dev
```

Frontend runs at `http://localhost:5173`.
Backend runs at `http://localhost:5000`.

## Payments

Appointment booking uses Razorpay Checkout in test mode. Add these values to `backend/.env`:

```bash
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
```

When a patient books a paid appointment, the backend creates a pending appointment and Razorpay order. The appointment becomes `confirmed` only after the Razorpay payment signature is verified. If the Razorpay keys are not configured, the app uses a local mock payment response for development.

## Demo Accounts

- Patient: `patient1@healix.test` / `Password123!`
- Doctor: `doctor1@healix.test` / `Password123!`
- Admin: `admin@healix.test` / `Password123!`

## How To Use

1. Start by seeding the database with `npm run seed` so the demo users, doctor profiles, and lab tests are available.
2. Open the frontend in your browser and sign in with one of the demo accounts above.
3. Use the sidebar or top navigation to move between the dashboard and the feature pages.
4. If you are a patient, update your health form before booking appointments or starting a consultation.
5. If you are a doctor, review appointments, manage your schedule, and create prescriptions during consultations.
6. If you are an admin, open the admin dashboard to review platform stats and manage doctors or blocked users.

## Main Features

- Authentication: register, log in, verify email, reset password, and keep sessions active with JWT tokens.
- Doctor discovery: search and filter doctors by specialization, rating, experience, and availability.
- Appointments: book visits, pay with Razorpay before confirmation, track status updates, and store a pre-consultation health form.
- Consultation: join a video consultation room with chat and call signaling support.
- Prescriptions: create medicine plans and download a PDF copy for the patient.
- Queue management: join a real-time doctor queue and receive live updates.
- AI assistant: submit symptoms for triage guidance and recommended next steps.
- Labs and orders: book lab tests, create medicine orders, and review order history.
- Notifications: receive alerts for appointments, reminders, payments, and system events.
- Admin tools: view system metrics and manage doctor approval or user blocking.

## Suggested Workflow

- Patient flow: log in, complete the health form, browse doctors, book an appointment, join the consultation, view the prescription, and follow reminders.
- Doctor flow: log in, check upcoming appointments, update availability, manage the consultation queue, create prescriptions, and monitor ratings.
- Admin flow: log in, check platform statistics, approve doctors, and handle user moderation when needed.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for Vercel, Render, and MongoDB Atlas setup.
