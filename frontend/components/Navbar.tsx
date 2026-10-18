'use client';

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Ticket, User as UserIcon, LogOut, Shield, Calendar } from 'lucide-react';

interface NavbarProps {
  onOpenAuth: (initialTab?: 'login' | 'register') => void;
  onOpenMyBookings: () => void;
  onOpenAdmin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAuth,
  onOpenMyBookings,
  onOpenAdmin,
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#0c1017]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
            <Ticket className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            EventBook
          </span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              {/* My Bookings */}
              <button
                onClick={onOpenMyBookings}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition"
              >
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>My Bookings</span>
              </button>

              {/* Admin Panel button if role === 'admin' */}
              {user.role === 'admin' && (
                <button
                  onClick={onOpenAdmin}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-purple-200 hover:text-white bg-purple-900/40 hover:bg-purple-800/50 border border-purple-500/30 transition"
                >
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span>Admin Panel</span>
                </button>
              )}

              {/* User Dropdown / Profile pill */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                {/* Avatar with initial — always visible */}
                <div
                  className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 select-none"
                  title={user.name}
                >
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                {/* Name + role — only on sm+ */}
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-200 leading-none">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-rose-500/20 transition flex items-center gap-1"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('login')}
                className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition"
              >
                Create Account
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
