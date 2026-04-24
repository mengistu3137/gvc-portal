import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { AcademicExplorer } from './pages/AcademicExplorer';
import { EnrollmentManager } from './pages/EnrollmentManager';
import { GradeApprovalDashboard } from './pages/GradeApprovalDashboard';
// import { GradeEntry } from './pages/GradeEntry';
import { InstructorManager } from './pages/InstructorManager';
import { LoginPage } from './pages/auth/LoginPage';
import { SectorOccupationManager } from './pages/SectorOccupationManager';
import { ModuleManager } from './pages/ModuleManager';
import { StaffManager } from './pages/staff/StaffManager';
import { StudentListDemo } from './pages/StudentListDemo';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { AcademicManager } from './pages/AcademicManager';
import { GradingManager } from './pages/GradingManager';


function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected Routes */}
      <Route
        path="/*"
        element={
          // Outer wrapper ensures authentication for all inner routes
          <ProtectedRoute>
            <AppLayout>
              <Routes>
                {/* Dashboard / Home - Accessible by Admins and Academic Directors */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'ACADEMIC_DIRECTOR']}>
                      <SectorOccupationManager />
                    </ProtectedRoute>
                  }
                />

                {/* Academic Management - Admins & Registrars */}
                <Route
                  path="/academics"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'REGISTRAR']}>
                      <AcademicManager />
                    </ProtectedRoute>
                  }
                />

                {/* Staff Management - Admins & HR */}
                <Route
                  path="/staff"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'HR_MANAGER']}>
                      <StaffManager />
                    </ProtectedRoute>
                  }
                />


                {/* Instructor Management - Admins & Academic Directors */}
                <Route
                  path="/instructors"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'ACADEMIC_DIRECTOR']}>
                      <InstructorManager />
                    </ProtectedRoute>
                  }
                />

                {/* Student Management - Accessible by many */}
                <Route
                  path="/students"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'REGISTRAR', 'INSTRUCTOR']}>
                      <StudentListDemo />
                    </ProtectedRoute>
                  }
                />

                {/* Module Management - Academic Directors */}
                <Route
                  path="/modules"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'ACADEMIC_DIRECTOR']}>
                      <ModuleManager />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/grading"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'INSTRUCTOR']}>
                      <GradingManager />
                    </ProtectedRoute>
                  }
                />

                {/* Enrollment - Registrars primarily */}
                <Route
                  path="/enrollment"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'REGISTRAR']}>
                      <EnrollmentManager />
                    </ProtectedRoute>
                  }
                />

                {/* Grading - Instructors & Academic Directors */}
                <Route
                  path="/grading"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'ACADEMIC_DIRECTOR', 'INSTRUCTOR']}>
                      <GradeApprovalDashboard />
                    </ProtectedRoute>
                  }
                />

             {/*    <Route
                  path="/grade-entry"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'INSTRUCTOR']}>
                      <GradeEntry />
                    </ProtectedRoute>}
                /> */}

                {/* Explorer - Generally accessible to authenticated users */}
                <Route path="/academic-explorer" element={<AcademicExplorer />} />

                {/* Fallback */}
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