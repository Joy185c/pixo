import axios from 'axios';

// ── API URL Configuration ─────────────────────────────────────
// For LOCAL testing (debug APK on same network):
//   Set to your PC's local IP: http://192.168.x.x:4000/api
//
// For PRODUCTION (after backend deployed to Render):
//   Set to: https://pixo-backend.onrender.com/api
//
// Switch this before building the APK.
const LOCAL_IP = '10.222.235.117';

export const API_BASE_URL = __DEV__
  ? `http://${LOCAL_IP}:4000/api`
  : 'https://pixo-5l0v.onrender.com/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging in dev
if (__DEV__) {
  apiClient.interceptors.request.use(req => {
    console.log(`[API] ${req.method?.toUpperCase()} ${req.baseURL}${req.url}`);
    return req;
  });
  apiClient.interceptors.response.use(
    res => res,
    err => {
      console.error(`[API Error] ${err.message}`, err.response?.data);
      return Promise.reject(err);
    }
  );
}
