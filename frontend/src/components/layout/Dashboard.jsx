import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Calendar, 
  Settings, 
  LogOut,
  GraduationCap
} from 'lucide-react';

const SidebarLink = ({ to, icon: Icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
  
  return (
    <Link 
      to={to} 
      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        isActive 
          ? 'bg-brand-blue text-white shadow-md' 
          : 'text-gray-600 hover:bg-brand-blue/10 hover:text-brand-blue'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </Link>
  );
};

export const DashboardLayout = () => {
  const { person, logout, getUserType } = useAuthStore();
  const userType = getUserType();

  const getNavItems = () => {
    // Common items
    let items = [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ];

    if (userType === 'STUDENT') {
      items.push(
        { to: '/dashboard/courses', icon: BookOpen, label: 'My Modules' },
        { to: '/dashboard/grades', icon: GraduationCap, label: 'Grades & GPA' },
      );
    } else if (userType === 'INSTRUCTOR') {
      items.push(
        { to: '/dashboard/my-classes', icon: BookOpen, label: 'My Classes' },
        { to: '/dashboard/grading', icon: GraduationCap, label: 'Grading' },
      );
    } else if (userType === 'STAFF' || userType === 'ADMIN') {
      items.push(
        { to: '/dashboard/students', icon: Users, label: 'Students' },
        { to: '/dashboard/academics', icon: BookOpen, label: 'Academics' },
        { to: '/dashboard/batches', icon: Calendar, label: 'Batches' },
      );
    }

    items.push({ to: '/dashboard/settings', icon: Settings, label: 'Settings' });
    return items;
  };

  return (
    <div className="min-h-screen flex bg-brand-background">
      {/* Sidebar */}
      <aside className="w-64 bg-brand-surface border-r border-gray-200 fixed h-full z-10 flex flex-col">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-blue rounded-lg flex items-center justify-center text-white font-bold">G</div>
          <div>
            <h1 className="font-bold text-brand-ink text-lg leading-tight">Grand Valley</h1>
            <p className="text-xs text-gray-500">College Portal</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {getNavItems().map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-brand-yellow text-brand-blue flex items-center justify-center font-bold">
              {person?.first_name?.[0] || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-brand-ink truncate">
                {person?.first_name} {person?.last_name}
              </p>
              <p className="text-xs text-gray-500 capitalize">{userType}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-2 w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <Outlet />
      </main>
    </div>
  );
};