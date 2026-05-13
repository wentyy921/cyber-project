import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Точка входа (Entry Point) для React/Vite приложения.
// Связывает виртуальный DOM React с реальным DOM браузера через элемент 'root'.
// StrictMode используется для отлова потенциальных проблем в приложении во время разработки 
// (например, двойной вызов эффектов или использование устаревших API).
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

