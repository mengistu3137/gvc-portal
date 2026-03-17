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
  { label: 'Instructors', icon: UserRound, to: '/instructors' },
  { label: 'Staff', icon: UsersRound, to: '/staff' },
  { label: 'Grading', icon: BookOpenCheck, to: '/grading' },
  { label: 'Students', icon: GraduationCap, to: '/students' },
  { label: 'Enrollment', icon: ShieldCheck, to: '/enrollment' },
  { label: 'Explorer', icon: Bell, to: '/explorer' },
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
      <aside className="fixed inset-y-0 left-0 z-30 w-16 border-r border-primary/30 bg-primary">
        <div className="flex h-14 items-center justify-center border-b border-white/15">
          <span className="text-sm font-bold tracking-widest text-white">GVC</span>
        </div>
        <nav className="mt-3 flex flex-col items-center gap-1 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex h-10 w-10 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white',
                  isActive && 'bg-white/15 text-white'
                )
              }
              title={item.label}
            >
              <item.icon size={17} />
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="pl-16">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-14 items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-primary">
              {crumbs.map((crumb, index) => (
                <span key={crumb + index} className="inline-flex items-center gap-2">
                  {index > 0 ? <span className="text-slate-300">/</span> : null}
                  <span className={cn(index === crumbs.length - 1 && 'font-semibold text-primary lowercase first-letter:uppercase')}>
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
