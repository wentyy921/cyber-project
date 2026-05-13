import axios from 'axios';

// Инициализация синглтона Axios.
// Служит централизованным шлюзом (API Gateway) для всех HTTP-запросов фронтенда к бэкенду.
// Это позволяет единообразно настраивать заголовки, таймауты и обрабатывать ошибки.
const api = axios.create({
  // В режиме разработки (development) используется явный URL бэкенда.
  // В продакшене (production) этот URL может подменяться через переменные окружения (.env).
  baseURL: 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor (Перехватчик запросов).
// Архитектурно важный паттерн: перед отправкой КАЖДОГО запроса перехватчик проверяет
// наличие JWT-токена в локальном хранилище и автоматически прикрепляет его в заголовок Authorization.
// Это избавляет от необходимости вручную добавлять токен в каждом API-вызове.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lms_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor (Перехватчик ответов).
// Глобальный обработчик ошибок. Если бэкенд возвращает статус 401 (Unauthorized) 
// или 403 (Forbidden), это означает, что токен просрочен, недействителен или пользователь забанен.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Экстренная очистка сессии на стороне клиента (очистка localStorage)
      localStorage.removeItem('lms_token');
      localStorage.removeItem('lms_user');
      
      // Принудительный редирект на экран логина для повторной авторизации.
      // window.location.href используется для жесткой перезагрузки стейта приложения.
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

