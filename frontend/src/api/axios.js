import axios from "axios";

const apiHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
const fallbackBaseURL = import.meta.env.DEV ? `http://${apiHost}:5000/api` : "";
const configuredBaseURL = import.meta.env.VITE_API_URL;
const shouldUseCurrentHost = import.meta.env.DEV && apiHost !== "localhost" && apiHost !== "127.0.0.1";

const API = axios.create({
  baseURL: shouldUseCurrentHost ? fallbackBaseURL : configuredBaseURL || fallbackBaseURL,
});

// if (!import.meta.env.VITE_API_URL && !import.meta.env.DEV) {
//   console.warn(
//     "VITE_API_URL is not set. Production login will fail until it points to the deployed backend API.",
//   );
// }

export default API;
