import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Management from './pages/Management';
import Shifts from './pages/Shifts';
import Calculo from './pages/Calculo';
import Vacaciones from './pages/Vacaciones';
import Requests from './pages/Requests';
import UserSettings from './pages/UserSettings';
import AuditLogs from './pages/AuditLogs';
import Maintenance from './pages/Maintenance';
import ManualPage from './pages/ManualPage';
import TechDocPage from './pages/TechDocPage';
import { PERMISSIONS } from './constants/permissions';
import { usePermissions } from './hooks/usePermissions';

const ProtectedRoute = ({ children }) => {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const token = localStorage.getItem('token');
    
    if (!user || !token) {
        return <Navigate to="/login" replace />;
    }
    // Permitir roles válidos
    const validRoles = ['admin', 'jefe_departamento', 'responsable', 'employee', 'administracion'];
    if (!validRoles.includes(user.role)) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        return <Navigate to="/login" replace />;
    }
    return children;
};

const PermissionRoute = ({ children, permission }) => {
    const { hasPermission } = usePermissions();
    if (!hasPermission(permission)) {
        return <Navigate to="/dashboard" replace />;
    }
    return children;
};


function App() {
    return (
        <ThemeProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />

                    <Route path="/" element={
                        <ProtectedRoute>
                            <Layout />
                        </ProtectedRoute>
                    }>
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard" element={
                            <PermissionRoute permission={PERMISSIONS.DASHBOARD_VIEW}>
                                <Dashboard />
                            </PermissionRoute>
                        } />
                        <Route path="management" element={
                            <PermissionRoute permission={PERMISSIONS.USERS_VIEW}>
                                <Management />
                            </PermissionRoute>
                        } />
                        <Route path="logs" element={
                            <PermissionRoute permission={PERMISSIONS.AUDIT_LOGS_VIEW}>
                                <AuditLogs />
                            </PermissionRoute>
                        } />
                        <Route path="maintenance" element={
                            <PermissionRoute permission={PERMISSIONS.MAINTENANCE_VIEW}>
                                <Maintenance />
                            </PermissionRoute>
                        } />
                        <Route path="shifts" element={
                            <PermissionRoute permission={PERMISSIONS.SHIFTS_VIEW}>
                                <Shifts />
                            </PermissionRoute>
                        } />
                        <Route path="calculo" element={
                            <PermissionRoute permission={PERMISSIONS.CALCULO_VIEW}>
                                <Calculo />
                            </PermissionRoute>
                        } />
                        <Route path="vacaciones" element={
                            <PermissionRoute permission={PERMISSIONS.VACACIONES_VIEW}>
                                <Vacaciones />
                            </PermissionRoute>
                        } />
                        <Route path="requests" element={
                            <PermissionRoute permission={PERMISSIONS.REQUESTS_VIEW}>
                                <Requests />
                            </PermissionRoute>
                        } />
                        <Route path="manual" element={
                            <PermissionRoute permission={PERMISSIONS.MANUAL_VIEW}>
                                <ManualPage />
                            </PermissionRoute>
                        } />
                        <Route path="tech-doc" element={
                            <PermissionRoute permission={PERMISSIONS.TECH_DOC_VIEW}>
                                <TechDocPage />
                            </PermissionRoute>
                        } />
                        <Route path="settings" element={<UserSettings />} />
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;
