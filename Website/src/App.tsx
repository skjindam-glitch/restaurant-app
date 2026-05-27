import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, roleHomeRoute } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tables from './pages/Tables';
import Orders from './pages/Orders';
import Billing from './pages/Billing';
import Kitchen from './pages/Kitchen';
import Menu from './pages/Menu';
import Reports from './pages/Reports';
import BillingHistory from './pages/BillingHistory';
import StaffManagement from './pages/StaffManagement';
import Investment from './pages/Investment';

function ProtectedRoute({ children, routeKey }: { children: React.ReactNode; routeKey: string }) {
  const { user, can } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!can(routeKey)) return <Navigate to={roleHomeRoute[user.role]} replace />;
  return <>{children}</>;
}

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={roleHomeRoute[user.role]} replace />;
}

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<RootRedirect />} />
        <Route path="dashboard"  element={<ProtectedRoute routeKey="dashboard"><Dashboard /></ProtectedRoute>} />
        <Route path="tables"     element={<ProtectedRoute routeKey="tables"><Tables /></ProtectedRoute>} />
        <Route path="orders"     element={<ProtectedRoute routeKey="orders"><Orders /></ProtectedRoute>} />
        <Route path="billing"    element={<ProtectedRoute routeKey="billing"><Billing /></ProtectedRoute>} />
        <Route path="kitchen"    element={<ProtectedRoute routeKey="kitchen"><Kitchen /></ProtectedRoute>} />
        <Route path="menu"       element={<ProtectedRoute routeKey="menu"><Menu /></ProtectedRoute>} />
        <Route path="reports"    element={<ProtectedRoute routeKey="reports"><Reports /></ProtectedRoute>} />
        <Route path="history"    element={<ProtectedRoute routeKey="billing"><BillingHistory /></ProtectedRoute>} />
        <Route path="staff"      element={<ProtectedRoute routeKey="staff"><StaffManagement /></ProtectedRoute>} />
        <Route path="investment" element={<ProtectedRoute routeKey="investment"><Investment /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <NotificationProvider>
            <AppRoutes />
          </NotificationProvider>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
