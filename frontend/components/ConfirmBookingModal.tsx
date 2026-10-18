'use client';

import React from 'react';
import { EventItem } from '../lib/types';
import { Ticket, Calendar, MapPin, X, AlertCircle } from 'lucide-react';

interface ConfirmBookingModalProps {
  isOpen: boolean;
  event: EventItem | null;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmBookingModal: React.FC<ConfirmBookingModalProps> = ({
  isOpen,
  event,
  loading,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !event) return null;

  const eventDate = new Date(event.date_time);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = eventDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) {
      onCancel();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-[#111724] border border-slate-700/80 shadow-2xl p-6 text-slate-100">
        <button
          onClick={onCancel}
          disabled={loading}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <Ticket className="w-4 h-4" />
          </div>
          <h3 className="text-base font-semibold text-white">Confirm Booking</h3>
        </div>

        <p className="text-xs text-slate-300 mb-4 leading-relaxed">
          Are you sure you want to reserve a seat for:
        </p>

        {/* Event Card preview */}
        <div className="p-3.5 rounded-xl bg-[#0b0f17] border border-slate-800 space-y-2 mb-5">
          <h4 className="text-sm font-bold text-white leading-snug">{event.title}</h4>
          <div className="text-xs text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>{formattedDate} • {formattedTime}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span className="truncate">{event.venue}</span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Seat Allocation: <strong>1 seat</strong></span>
            <span className="text-emerald-400 font-medium">{event.seats_left} seats left</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium rounded-lg text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition disabled:opacity-50"
          >
            {loading ? 'Confirming...' : 'Yes, Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );
};
