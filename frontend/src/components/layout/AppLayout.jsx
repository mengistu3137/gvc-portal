import {
  Bell,
  BookOpenCheck,
  GraduationCap,
  LayoutDashboard,
  ShieldCheck,
  UserCircle2,
  UserRound,
  UsersRound,
  Boxes,
  FileBadge2,
  Layers, // Added for Academics icon
} from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { clearAuthSession, getAuthUser, hasRole } from '../../lib/auth';
import { cn } from '../../lib/utils';

// Define permission/role requirements for sidebar visibility
// We use roles here since we switched to RBAC
const navItems = [
  { 
    label: 'Dashboard', 
    icon: LayoutDashboard, 
    to: '/', 
    roles: ['ADMIN', 'ACADEMIC_DIRECTOR', 'REGISTRAR'] 
  },
    { 
    label: 'Staff', 
    icon: UsersRound, 
    to: '/staff', 
    roles: ['ADMIN', 'HR_MANAGER'] 
  },
  { 
    label: 'Academics', 
    icon: Layers, // Added this item
    to: '/academics', 
    roles: ['ADMIN', 'ACADEMIC_DIRECTOR', 'REGISTRAR'] 
  },
  {
    label: 'Grading',
    icon: GraduationCap,
    to: '/grading',
    roles: ['ADMIN', 'ACADEMIC_DIRECTOR', 'REGISTRAR', 'INSTRUCTOR'],

  },

  { 
    label: 'Sectors & Occupations', 
    icon: Boxes, 
    to: '/academic-explorer', 
    roles: ['ADMIN', 'ACADEMIC_DIRECTOR', 'INSTRUCTOR'] 
  },
  { 
    label: 'Modules', 
    icon: BookOpenCheck, 
    to: '/modules', 
    roles: ['ADMIN', 'ACADEMIC_DIRECTOR'] 
  },
  { 
    label: 'Instructors', 
    icon: UserRound, 
    to: '/instructors', 
    roles: ['ADMIN', 'ACADEMIC_DIRECTOR'] 
  },

  { 
    label: 'Enrollment', 
    icon: ShieldCheck, 
    to: '/enrollment', 
    roles: ['ADMIN', 'REGISTRAR'] 
  },
  { 
    label: 'Grade Entry', 
    icon: FileBadge2, 
    to: '/grade-entry', 
    roles: ['ADMIN', 'INSTRUCTOR'] 
  },
  { 
    label: 'Grade Approvals', 
    icon: GraduationCap, 
    to: '/grading', 
    roles: ['ADMIN', 'ACADEMIC_DIRECTOR', 'INSTRUCTOR'] 
  },
  { 
    label: 'Students', 
    icon: UsersRound, // Re-using UsersRound, or you can import UserCircle
    to: '/students', 
    roles: ['ADMIN', 'REGISTRAR', 'INSTRUCTOR'] 
  },
];

function buildBreadcrumbs(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) {
    return ['Home'];
  }
  return ['Home', ...parts.map((part) => part.replace(/-/g, ' '))];
}

export function AppLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const crumbs = buildBreadcrumbs(location.pathname);
  const authUser = getAuthUser();

  const onLogout = () => {
    clearAuthSession();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-brand-background">
      <aside className="fixed inset-y-0 left-0 z-30 w-20 border-r border-brand-blue/40 bg-brand-blue text-white md:w-64">
        {/* Sidebar Header / Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
          <img src="/gvc_logo.png" alt="GVC Logo" className="h-8 w-8 rounded-full bg-white p-0.5" />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">Grand Valley</p>
            <p className="text-[11px] text-brand-yellow/90">College Portal</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="mt-4 flex flex-col gap-1 px-2 md:px-4">
          {navItems
            .filter((item) => !item.roles || hasRole(item.roles))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                aria-label={item.label}
                className={({ isActive }) =>
                  cn(
                    'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-blue focus-visible:ring-white',
                    'hover:bg-white/10 hover:text-white',
                    isActive && 'bg-white/15 text-white shadow-[0_6px_24px_rgba(0,0,0,0.16)] ring-1 ring-white/10'
                  )
                }
                title={item.label}
              >
                <item.icon size={18} className="shrink-0" />
                <span className="hidden md:inline">{item.label}</span>
              </NavLink>
            ))}
        </nav>
      </aside>

      <div className="pl-20 md:pl-64">
        <header className="sticky top-0 z-20 border-b border-border-strong bg-brand-surface/95 backdrop-blur supports-[backdrop-filter]:bg-brand-surface/60">
          <div className="flex h-14 items-center justify-between px-4 md:px-6">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-primary">
              {crumbs.map((crumb, index) => (
                <span key={crumb + index} className="inline-flex items-center gap-2">
                  {index > 0 ? <span className="text-slate-300">/</span> : null}
                  <span className={cn(index === crumbs.length - 1 && 'font-semibold text-brand-ink lowercase first-letter:uppercase')}>
                    {crumb}
                  </span>
                </span>
              ))}
            </div>

            {/* User Actions */}
            <div className="flex items-center gap-3 text-sm">
              <Link to="#" className="rounded-full border border-border-strong bg-surface-muted p-1.5 text-slate-500 hover:bg-surface-muted/80 transition-colors">
                <Bell size={14} />
              </Link>
              <div className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface-muted px-3 py-1">
                <UserCircle2 size={16} className="text-primary" />
                <span className="text-xs font-medium text-brand-ink">
                  {authUser?.full_name || authUser?.email || 'User'}
                </span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="rounded border border-border-strong px-3 py-1 text-xs font-medium text-slate-600 hover:bg-surface-muted hover:text-brand-ink transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}