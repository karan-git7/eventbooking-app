'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Ticket, User as UserIcon, LogOut, Shield, Calendar, Sparkles } from 'lucide-react';

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
  const { user, logout, loginAsDemoAdmin, loginAsDemoUser } = useAuth();
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const handleDemoAdmin = async () => {
    try {
      setIsDemoLoading(true);
      await loginAsDemoAdmin();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleDemoUser = async () => {
    try {
      setIsDemoLoading(true);
      await loginAsDemoUser();
    } catch (err) {
      console.error(err);
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#090d16]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Ticket className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              EventBook
            </span>
            <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Live
            </span>
          </div>
        </div>

        {/* Center / Navigation Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Demo Logins for Quick Testing */}
          <div className="hidden md:flex items-center gap-1.5 p-1 rounded-lg bg-slate-900/90 border border-slate-800">
            <span className="text-xs text-slate-400 font-medium px-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Demo:
            </span>
            <button
              onClick={handleDemoUser}
              disabled={isDemoLoading}
              className="px-2.5 py-1 text-xs font-medium rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition"
              title="Sign in as normal test user"
            >
              Normal User
            </button>
            <button
              onClick={handleDemoAdmin}
              disabled={isDemoLoading}
              className="px-2.5 py-1 text-xs font-medium rounded-md text-purple-300 hover:text-purple-200 hover:bg-purple-950/40 border border-purple-500/20 transition"
              title="Sign in as seeded Admin"
            >
              Admin
            </button>
          </div>

          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* My Bookings Button */}
              <button
                onClick={onOpenMyBookings}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-slate-200 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition"
              >
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>My Bookings</span>
              </button>

              {/* Admin Button */}
              {user.role === 'admin' && (
                <button
                  onClick={onOpenAdmin}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-purple-200 hover:text-white bg-purple-900/40 hover:bg-purple-800/50 border border-purple-500/30 transition shadow-sm shadow-purple-900/20"
                >
                  <Shield className="w-4 h-4 text-purple-400" />
                  <span>Admin Panel</span>
                </button>
              )}

              {/* User Dropdown / Profile pill */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
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
                className="px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth('register')}
                className="px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-md shadow-indigo-500/20 transition transform active:scale-95"
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
