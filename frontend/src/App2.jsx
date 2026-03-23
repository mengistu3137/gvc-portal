import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardLayout } from './components/layout/DashboardLayout';

// Placeholder pages for routes (we will build these soon)
const DashboardHome = () => <div className="p-6"><h1 className="text-2xl font-bold">Welcome to Dashboard</h1></div>;
const PageNotFound = () => <div className="p-6 text-red-500">404 - Page Not Found</div>;

/*************  ✨ Windsurf Command ⭐  *************/
/**
 * App component.
 * 
 * This component contains the main routing for the application. It contains
 * a protected route that renders the AppLayout component, which contains
 * the side navigation and the main content area.
 * 
 * The protected route renders the following components based on the route path:
 * - SectorOccupationManager component for the root path
 * - GradeApprovalDashboard component for the /grading path


/*******  ce2e2e74-64f0-45ec-8a24-135f72e9bca1  *******/// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App2() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes (Wrapped in Dashboard Layout) */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Default dashboard child */}
          <Route index element={<DashboardHome />} />
          
          {/* Other routes will be added here as we build them */}
          {/* Example: <Route path="students" element={<StudentList />} /> */}
        </Route>

        {/* Default Redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* 404 */}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App2;