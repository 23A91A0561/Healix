# API Documentation

Base URL: `/api`

## Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/verify-email/:token`
- `GET /auth/me`

## Doctors

- `GET /doctors`
- `GET /doctors/:id`
- `PATCH /doctors/:id/approve` admin
- `PATCH /doctors/:id/schedule` doctor/admin

## Appointments

- `GET /appointments`
- `POST /appointments` patient, creates a pending appointment plus Razorpay order when `amount` is greater than 0
- `POST /appointments/:id/payment/verify` patient, verifies Razorpay payment and confirms the appointment
- `PATCH /appointments/:id/status`
- `POST /appointments/:id/health-form`

Paid appointments cannot be confirmed until the linked payment has status `success`.

## Prescriptions

- `GET /prescriptions`
- `POST /prescriptions`
- `GET /prescriptions/:id/pdf`

## Queue, Chat, Video

- `GET /queue/:doctorId`
- Socket events: `queue:join`, `queue:next`, `call:offer`, `call:answer`, `call:ice`, `chat:message`, `notification:read`

## AI Assistant

- `POST /ai/analyze`
- `GET /ai/symptoms`

The assistant performs symptom triage and safety guidance only. It does not prescribe medicine.
