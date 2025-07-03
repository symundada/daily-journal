// API configuration for connecting to your backend
const API_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://your-backend-url.railway.app/api" // We'll update this after backend deployment
    : "http://localhost:5000/api"

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    REGISTER: `${API_BASE_URL}/auth/register`,
    ME: `${API_BASE_URL}/auth/me`,
  },
  ENTRIES: {
    LIST: `${API_BASE_URL}/entries`,
    CREATE: `${API_BASE_URL}/entries`,
    GET: (id: string) => `${API_BASE_URL}/entries/${id}`,
    UPDATE: (id: string) => `${API_BASE_URL}/entries/${id}`,
    DELETE: (id: string) => `${API_BASE_URL}/entries/${id}`,
    CALENDAR: (year: number, month: number) => `${API_BASE_URL}/entries/calendar/${year}/${month}`,
  },
}

export default API_BASE_URL
