import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Global Fetch Interceptor para JWT
const originalFetch = window.fetch;
window.fetch = async (...args) => {
    let [resource, config] = args;
    const token = localStorage.getItem('token');
    
    // Inyectar token solo si es una llamada a la API (identificada por /api o similar)
    // No inyectar si ya tiene Authorization o si es un recurso estático (como .md)
    if (token && typeof resource === 'string' && resource.includes('/api') && !resource.endsWith('.md')) {
        config = config || {};
        const headers = config.headers ? (config.headers instanceof Headers ? config.headers : new Headers(config.headers)) : new Headers();
        
        if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
            config.headers = headers;
        }
    }
    
    const response = await originalFetch(resource, config);
    
    // Si el servidor devuelve 401 (desautorizado), excepto en login, cerramos sesión
    if (response.status === 401 && typeof resource === 'string' && !resource.includes('/api/login')) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    }
    return response;
};

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
