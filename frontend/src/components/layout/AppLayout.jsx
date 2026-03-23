import {
  Bell,
  BookOpenCheck,
  GraduationCap,
  LayoutDashboard,
  ShieldCheck,
  UserCircle2,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { clearAuthSession, getAuthUser } from '../../lib/auth';
import { cn } from '../../lib/utils';

const navItems = [
  { label: 'Sectors', icon: LayoutDashboard, to: '/' },
  { label: 'Modules', icon: BookOpenCheck, to: '/modules' },
  { label: 'Instructors', icon: UserRound, to: '/instructors' },
  { label: 'Staff', icon: UsersRound, to: '/staff' },
  { label: 'Grade Entry', icon: BookOpenCheck, to: '/grade-entry' },
  { label: 'Grading', icon: ShieldCheck, to: '/grading' },
  { label: 'Policies', icon: ShieldCheck, to: '/grading-policies' },
  { label: 'Students', icon: GraduationCap, to: '/students' },
  { label: 'Enrollment', icon: ShieldCheck, to: '/enrollment' },
  { label: 'Explorer', icon: Bell, to: '/academic-explorer' },
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
        <div className="flex h-14 items-center gap-3 border-b border-white/15 px-4 md:px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-sm font-bold tracking-widest text-white">
            GVC
          </span>
          <div className="hidden md:block leading-tight">
            <p className="text-sm font-semibold">Grand Valley</p>
            <p className="text-[11px] text-white/75">College Portal</p>
          </div>
        </div>
        <nav className="mt-4 flex flex-col gap-1 px-2 md:px-4">
          {navItems.map((item) => (
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
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-14 items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-brand-blue">
              {crumbs.map((crumb, index) => (
                <span key={crumb + index} className="inline-flex items-center gap-2">
                  {index > 0 ? <span className="text-slate-300">/</span> : null}
                  <span className={cn(index === crumbs.length - 1 && 'font-semibold text-brand-ink lowercase first-letter:uppercase')}>
                    {crumb}
                  </span>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Link to="#" className="rounded-full border border-slate-200 p-1 text-slate-500">
                <Bell size={14} />
              </Link>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                <UserCircle2 size={16} className="text-primary" />
                <span className="text-xs font-medium text-slate-700">
                  {authUser?.full_name || authUser?.email || 'Registrar'}
                </span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-5">{children}</main>
      </div>
    </div>
  );
}
