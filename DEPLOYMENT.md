# Deployment Guide

## MongoDB Atlas

1. Create a cluster and database user.
2. Add the Render outbound IPs or allow your deployment environment.
3. Set `MONGO_URI` in Render.

## Backend on Render

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`
- Environment: copy values from `backend/.env.example`

## Frontend on Vercel

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Set `VITE_API_URL` to your Render backend URL plus `/api`
- Set `VITE_SOCKET_URL` to your Render backend URL
