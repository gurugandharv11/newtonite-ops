import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  CheckSquare,
  PlusCircle,
  Users,
  LogOut,
  ShieldAlert,
  Layers,
} from 'lucide-react';

export const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Navbar */}
      <header className="bg-slate-900 text-white shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">Newtonite Ops</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-400/20">
                Under Pressure
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-slate-100">{user?.fullName}</div>
              <div className="text-xs text-slate-400">
                @{user?.username} {user?.isGlobalAdmin && <span className="text-amber-400 font-bold">(Global Admin)</span>}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex items-center text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 transition"
              title="Sign out"
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Sub-header */}
      <nav className="bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-8 overflow-x-auto">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `inline-flex items-center py-3.5 border-b-2 text-sm font-medium whitespace-nowrap transition ${
                isActive
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`
            }
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Operational Dashboard
          </NavLink>

          <NavLink
            to="/items"
            end
            className={({ isActive }) =>
              `inline-flex items-center py-3.5 border-b-2 text-sm font-medium whitespace-nowrap transition ${
                isActive
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`
            }
          >
            <CheckSquare className="w-4 h-4 mr-2" />
            Work Items
          </NavLink>

          <NavLink
            to="/items/new"
            className={({ isActive }) =>
              `inline-flex items-center py-3.5 border-b-2 text-sm font-medium whitespace-nowrap transition ${
                isActive
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`
            }
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Create Work Item
          </NavLink>

          <NavLink
            to="/teams"
            className={({ isActive }) =>
              `inline-flex items-center py-3.5 border-b-2 text-sm font-medium whitespace-nowrap transition ${
                isActive
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`
            }
          >
            <Users className="w-4 h-4 mr-2" />
            Teams & Roster
          </NavLink>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        Newtonite Operations Under Pressure &bull; Full-Stack Work Management System &bull; Java 21 / Spring Boot &bull; React &bull; MySQL
      </footer>
    </div>
  );
};
