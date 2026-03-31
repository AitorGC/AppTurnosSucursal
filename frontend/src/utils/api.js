import apiConfig from '../apiConfig';

/**
 * Wrapper de fetch que inyecta automáticamente el token JWT
 * desde localStorage en el header de Authorization.
 */
export async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${apiConfig}${endpoint}`, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        // Token expirado o inválido -> limpieza y redirección
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        window.location.href = '/login';
    }

    return response;
}
