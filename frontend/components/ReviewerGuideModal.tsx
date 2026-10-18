'use client';

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { X, Shield, User, KeyRound, ArrowRight } from 'lucide-react';

interface ReviewerGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReviewerGuideModal: React.FC<ReviewerGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { loginAsDemoAdmin, loginAsDemoUser } = useAuth();

  if (!isOpen) return null;

  const handleAdminLogin = async () => {
    try {
      await loginAsDemoAdmin();
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUserLogin = async () => {
    try {
      await loginAsDemoUser();
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  // Clicking backdrop dismisses popup
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-[#111622] border border-slate-700/60 shadow-2xl overflow-hidden p-6 text-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          title="Close (or click anywhere outside)"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2 mb-2">
          <KeyRound className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-semibold text-white">Test & Demo Accounts</h3>
        </div>
        <p className="text-xs text-slate-400 mb-5 leading-relaxed">
          Use the pre-configured accounts below or click anywhere outside to browse as a visitor.
        </p>

        {/* Accounts Card List */}
        <div className="space-y-3 mb-5">
          {/* Admin Account */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-300">
                <Shield className="w-3.5 h-3.5" /> Admin Account
              </div>
              <div className="text-xs text-slate-300 font-mono">admin@gmail.com</div>
              <div className="text-[11px] text-slate-500 font-mono">Password: admin@123</div>
            </div>
            <button
              onClick={handleAdminLogin}
              className="py-1.5 px-3 rounded-lg text-xs font-medium bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 transition shrink-0"
            >
              Sign In
            </button>
          </div>

          {/* User Account */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                <User className="w-3.5 h-3.5" /> User Account (Karan)
              </div>
              <div className="text-xs text-slate-300 font-mono">karan@gmail.com</div>
              <div className="text-[11px] text-slate-500 font-mono">Password: karan@123</div>
            </div>
            <button
              onClick={handleUserLogin}
              className="py-1.5 px-3 rounded-lg text-xs font-medium bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 transition shrink-0"
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Dismiss action */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Click anywhere outside to dismiss</span>
          <button
            onClick={onClose}
            className="text-xs text-slate-300 hover:text-white font-medium flex items-center gap-1"
          >
            <span>Browse as Guest</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
