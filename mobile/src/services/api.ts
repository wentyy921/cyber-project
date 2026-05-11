import axios from 'axios';

// В эмуляторе Android порт 8000 будет проброшен на хост через adb reverse
// Это позволяет обращаться напрямую к 127.0.0.1 (локалхост компьютера)
const API_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export default api;
