import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { AcademicExplorer } from './pages/AcademicExplorer';
import { EnrollmentManager } from './pages/EnrollmentManager';
import { GradeApprovalDashboard } from './pages/GradeApprovalDashboard';
import { GradeEntry } from './pages/GradeEntry';
import { InstructorManager } from './pages/InstructorManager';
import { LoginPage } from './pages/LoginPage';
import { SectorOccupationManager } from './pages/SectorOccupationManager';
import { ModuleManager } from './pages/ModuleManager';
import { StaffManager } from './pages/StaffManager';
import { StudentListDemo } from './pages/StudentListDemo';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                <Route
                  path="/"
                  element={
                    <ProtectedRoute permission="view_sector">
                      <SectorOccupationManager />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/grading"
                  element={
                    <ProtectedRoute permission="manage_grading">
                      <GradeApprovalDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/grade-entry"
                  element={
                    <ProtectedRoute permission="manage_grading">
                      <GradeEntry />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/modules"
                  element={
                    <ProtectedRoute permission="view_module">
                      <ModuleManager />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/students"
                  element={
                    <ProtectedRoute permission="view_students">
                      <StudentListDemo />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/instructors"
                  element={
                    <ProtectedRoute permission="view_instructors">
                      <InstructorManager />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/staff"
                  element={
                    <ProtectedRoute permission="view_staff">
                      <StaffManager />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/enrollment"
                  element={
                    <ProtectedRoute permission="manage_enrollment">
                      <EnrollmentManager />
                    </ProtectedRoute>
                  }
                />
                <Route path="/academic-explorer" element={<AcademicExplorer />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
