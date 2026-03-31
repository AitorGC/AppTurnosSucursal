/**
 * Tests for the Login page component.
 * Covers: render, successful login, failed login, loading state during request.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../pages/Login';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return { ...actual, useNavigate: () => mockNavigate };
});

// Mock apiConfig so it doesn't try to resolve window.location.hostname
vi.mock('../apiConfig', () => ({ default: 'http://localhost:4000/api' }));

const renderLogin = () => render(<Login />, { wrapper: MemoryRouter });

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Página de Login', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        globalThis.fetch = vi.fn();
    });

    it('✅ renderiza el formulario con los campos y el botón de submit', () => {
        renderLogin();
        expect(screen.getByPlaceholderText(/12345/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
    });

    it('✅ guarda user y token en localStorage y navega a /dashboard tras login correcto', async () => {
        const fakeUser = { id: 1, name: 'Test', role: 'employee', permissions: [] };
        globalThis.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ user: fakeUser, token: 'fake.jwt.token' }),
        });

        renderLogin();
        fireEvent.change(screen.getByPlaceholderText(/12345/i), { target: { value: '100' } });
        fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'pass' } });
        fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

        await waitFor(() => {
            expect(localStorage.getItem('user')).not.toBeNull();
            expect(localStorage.getItem('token')).toBe('fake.jwt.token');
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
        });
    });

    it('🔴 muestra mensaje de error y no navega si las credenciales son inválidas', async () => {
        globalThis.fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => ({ message: 'Contraseña incorrecta' }),
        });

        renderLogin();
        fireEvent.change(screen.getByPlaceholderText(/12345/i), { target: { value: '100' } });
        fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'wrong' } });
        fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

        await waitFor(() => {
            expect(screen.getByText(/contraseña incorrecta/i)).toBeInTheDocument();
            expect(mockNavigate).not.toHaveBeenCalled();
            expect(localStorage.getItem('token')).toBeNull();
        });
    });

    it('🔴 muestra "Error de conexión" si fetch lanza una excepción de red', async () => {
        globalThis.fetch.mockRejectedValueOnce(new Error('Network failure'));

        renderLogin();
        fireEvent.change(screen.getByPlaceholderText(/12345/i), { target: { value: '100' } });
        fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'pass' } });
        fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));

        await waitFor(() => {
            expect(screen.getByText(/error de conexión/i)).toBeInTheDocument();
        });
    });

    it('✅ el botón queda deshabilitado mientras se procesa la petición (anti-doble-click)', async () => {
        // Fetch que nunca resuelve → el botón debe quedar disabled durante la espera
        globalThis.fetch.mockReturnValueOnce(new Promise(() => {}));

        renderLogin();
        const btn = screen.getByRole('button', { name: /iniciar sesión/i });
        fireEvent.change(screen.getByPlaceholderText(/12345/i), { target: { value: '100' } });
        fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'pass' } });
        fireEvent.click(btn);

        await waitFor(() => {
            expect(btn).toBeDisabled();
        });
    });
});
