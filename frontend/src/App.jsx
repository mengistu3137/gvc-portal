import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { AcademicExplorer } from './pages/AcademicExplorer';
import { EnrollmentManager } from './pages/EnrollmentManager';
import { GradeApprovalDashboard } from './pages/GradeApprovalDashboard';
import { InstructorManager } from './pages/InstructorManager';
import { LoginPage } from './pages/LoginPage';
import { SectorOccupationManager } from './pages/SectorOccupationManager';
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
                <Route path="/" element={<SectorOccupationManager />} />
                <Route path="/grading" element={<GradeApprovalDashboard />} />
                <Route path="/students" element={<StudentListDemo />} />
                <Route path="/instructors" element={<InstructorManager />} />
                <Route path="/staff" element={<StaffManager />} />
                <Route path="/enrollment" element={<EnrollmentManager />} />
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
