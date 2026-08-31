import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// ── PWA Service Worker ──────────────────────────────────────────
// registerSW devuelve una función para forzar la actualización
// cuando hay una nueva versión disponible.
import { registerSW } from 'virtual:pwa-register';

registerSW({
  // Muestra en consola que el SW está listo
  onRegistered(registration) {
    console.info('[Roomly PWA] Service Worker registrado:', registration);
  },
  // Si el SW necesita actualizarse, se recarga automáticamente
  onNeedRefresh() {
    // En modo silencioso simplemente actualizamos de inmediato.
    // Si prefieres preguntar al usuario, implementa una UI de toast aquí.
    window.location.reload();
  },
  onOfflineReady() {
    console.info('[Roomly PWA] App lista para usar sin conexión.');
  },
});

// ── Renderizado React (sin cambios) ────────────────────────────
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
