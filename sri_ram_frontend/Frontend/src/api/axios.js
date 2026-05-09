import axios from "axios";

const fallbackBaseURL = import.meta.env.DEV ? "http://localhost:5000/api" : "";

const API = axios.create({
baseURL: `${import.meta.env.VITE_API_URL}/api`});

// if (!import.meta.env.VITE_API_URL && !import.meta.env.DEV) {
//   console.warn(
//     "VITE_API_URL is not set. Production login will fail until it points to the deployed backend API.",
//   );
// }

export default API;
