import axios from 'axios';

// Инициализация синглтона Axios для мобильного приложения.
// В эмуляторе Android порт 8000 (FastAPI) пробрасывается на хост (adb reverse tcp:8000 tcp:8000).
// Это позволяет обращаться напрямую к 127.0.0.1 (локалхост компьютера) без необходимости
// хардкодить локальный IP-адрес роутера (например, 192.168.x.x).
const API_URL = 'http://127.0.0.1:8000/api';

// Создание экземпляра (Instance) Axios с преднастроенным базовым URL и заголовками.
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Утилита для глобальной установки JWT-токена.
// В отличие от React-веб версии с Interceptors, здесь используется механизм 
// внедрения заголовка по умолчанию (Default Headers). 
// Вызывается из AuthContext после успешного логина или при восстановлении сессии.
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    // Безопасное удаление заголовка при логауте для предотвращения утечки токена
    delete api.defaults.headers.common['Authorization'];
  }
};

export default api;

