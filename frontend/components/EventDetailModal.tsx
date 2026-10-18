'use client';

import React, { useState } from 'react';
import { EventItem, UserBooking } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import {
  X,
  Calendar,
  MapPin,
  Users,
  Ticket,
  CheckCircle2,
  AlertCircle,
  Tag,
  ShieldAlert,
} from 'lucide-react';

interface EventDetailModalProps {
  isOpen: boolean;
  event: EventItem | null;
  userBooking: UserBooking | null;
  onClose: () => void;
  onBook: (event: EventItem) => Promise<void>;
  onCancelBooking: (bookingId: string) => Promise<void>;
  onRequireAuth: () => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  isOpen,
  event,
  userBooking,
  onClose,
  onBook,
  onCancelBooking,
  onRequireAuth,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !event) return null;

  const eventDate = new Date(event.date_time);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = eventDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const isPast = event.is_past;
  const isSoldOut = event.seats_left <= 0;
  const isBooked = !!userBooking && userBooking.status === 'CONFIRMED';

  const handleBookClick = async () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    setActionError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      await onBook(event);
      setSuccessMessage('Your seat has been reserved successfully! See you at the event.');
    } catch (err: any) {
      setActionError(err.message || 'Unable to complete booking.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelClick = async () => {
    if (!userBooking) return;
    if (!confirm('Are you sure you want to cancel this booking? This will free your seat.')) return;

    setActionError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      await onCancelBooking(userBooking.id);
      setSuccessMessage('Booking cancelled. The seat has been freed.');
    } catch (err: any) {
      setActionError(err.message || 'Unable to cancel booking.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#101726] border border-slate-800 shadow-2xl">
        {/* Header Bar */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/80 bg-slate-900/50 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {event.category || 'General'}
            </span>
            {isPast ? (
              <span className="px-3 py-1 text-xs font-medium rounded-full badge-slate">
                Past Event
              </span>
            ) : isSoldOut ? (
              <span className="px-3 py-1 text-xs font-semibold rounded-full badge-rose">
                Sold Out
              </span>
            ) : (
              <span className="px-3 py-1 text-xs font-semibold rounded-full badge-emerald">
                {event.seats_left} seats remaining
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Title */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              {event.title}
            </h2>
          </div>

          {/* Feedback messages */}
          {actionError && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{actionError}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-sm flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Key Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-2 text-indigo-400 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium text-slate-400">Date & Time</span>
              </div>
              <p className="text-sm font-semibold text-slate-200">{formattedDate}</p>
              <p className="text-xs text-slate-400">{formattedTime}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-2 text-indigo-400 mb-1">
                <MapPin className="w-4 h-4" />
                <span className="text-xs font-medium text-slate-400">Location</span>
              </div>
              <p className="text-sm font-semibold text-slate-200 line-clamp-2">{event.venue}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-2 text-indigo-400 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs font-medium text-slate-400">Capacity & Seats</span>
              </div>
              <p className="text-sm font-semibold text-slate-200">
                {event.seats_left} / {event.total_seats} Left
              </p>
              <p className="text-xs text-slate-400">{event.booked_seats} booked</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-2">
              About This Event
            </h4>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed whitespace-pre-line">
              {event.description}
            </p>
          </div>

          {/* User Booking Notice */}
          {isBooked && (
            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">You have a confirmed seat!</p>
                  <p className="text-[11px] text-slate-400">
                    One seat is reserved for your account.
                  </p>
                </div>
              </div>
              {!isPast && (
                <button
                  onClick={handleCancelClick}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 transition"
                >
                  Cancel Booking
                </button>
              )}
            </div>
          )}

          {/* Footer Action */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-medium rounded-xl text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 transition"
            >
              Close
            </button>

            {!isBooked && (
              <button
                onClick={handleBookClick}
                disabled={isPast || isSoldOut || loading}
                className={`px-6 py-2.5 text-sm font-semibold rounded-xl flex items-center gap-2 transition ${
                  isPast || isSoldOut
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/40'
                    : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/25 active:scale-95'
                }`}
              >
                <Ticket className="w-4 h-4" />
                <span>
                  {loading
                    ? 'Processing...'
                    : isPast
                    ? 'Past Event'
                    : isSoldOut
                    ? 'Sold Out'
                    : 'Reserve Your Seat'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
