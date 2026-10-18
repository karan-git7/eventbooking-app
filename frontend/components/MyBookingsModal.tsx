'use client';

import React, { useState, useEffect } from 'react';
import { BookingItem } from '../lib/types';
import { api } from '../lib/api';
import {
  X,
  Calendar,
  MapPin,
  Ticket,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react';

interface MyBookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookingCancelled?: () => void;
}

export const MyBookingsModal: React.FC<MyBookingsModalProps> = ({
  isOpen,
  onClose,
  onBookingCancelled,
}) => {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'cancelled'>('all');

  useEffect(() => {
    if (isOpen) {
      fetchBookings();
    }
  }, [isOpen]);

  const fetchBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.bookings.myBookings();
      setBookings(res.bookings);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch bookings.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (booking: BookingItem) => {
    if (booking.is_past_event) {
      alert('Cannot cancel bookings for past events.');
      return;
    }

    if (!confirm(`Cancel your seat for "${booking.event_title}"? This will free the seat for other attendees.`)) {
      return;
    }

    setCancellingId(booking.booking_id);
    setError(null);
    try {
      await api.bookings.cancel(booking.booking_id);
      // Update local state
      setBookings((prev) =>
        prev.map((b) =>
          b.booking_id === booking.booking_id ? { ...b, status: 'CANCELLED' } : b
        )
      );
      if (onBookingCancelled) {
        onBookingCancelled();
      }
    } catch (err: any) {
      setError(err.message || 'Cancellation failed.');
    } finally {
      setCancellingId(null);
    }
  };

  if (!isOpen) return null;

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'confirmed') return b.status === 'CONFIRMED';
    if (filter === 'cancelled') return b.status === 'CANCELLED';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-[#101726] border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/80 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">My Booked Seats</h3>
              <p className="text-xs text-slate-400">View and manage your event registrations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-800/60 bg-slate-900/30">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
              filter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white bg-slate-800/50'
            }`}
          >
            All ({bookings.length})
          </button>
          <button
            onClick={() => setFilter('confirmed')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
              filter === 'confirmed'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white bg-slate-800/50'
            }`}
          >
            Confirmed ({bookings.filter((b) => b.status === 'CONFIRMED').length})
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
              filter === 'cancelled'
                ? 'bg-rose-600 text-white'
                : 'text-slate-400 hover:text-white bg-slate-800/50'
            }`}
          >
            Cancelled ({bookings.filter((b) => b.status === 'CANCELLED').length})
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-3" />
              <p className="text-sm">Loading your bookings...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 mx-auto mb-3 flex items-center justify-center text-slate-500">
                <Ticket className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-300">No bookings found</h4>
              <p className="text-xs text-slate-500 mt-1">
                You haven&apos;t booked any events in this filter yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredBookings.map((b) => {
                const eventDate = new Date(b.event_date_time);
                const isPast = b.is_past_event;
                const isConfirmed = b.status === 'CONFIRMED';

                return (
                  <div
                    key={b.booking_id}
                    className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] uppercase font-semibold rounded bg-slate-800 text-slate-300">
                          {b.event_category || 'General'}
                        </span>
                        {isConfirmed ? (
                          <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full badge-emerald flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Confirmed
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full badge-rose flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> Cancelled
                          </span>
                        )}
                        {isPast && (
                          <span className="px-2 py-0.5 text-[11px] font-medium rounded-full badge-slate">
                            Past Event
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-white">{b.event_title}</h4>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                          {eventDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {b.event_venue}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:self-center shrink-0">
                      {isConfirmed && !isPast && (
                        <button
                          onClick={() => handleCancel(b)}
                          disabled={cancellingId === b.booking_id}
                          className="py-1.5 px-3 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-200 bg-rose-950/30 hover:bg-rose-900/40 border border-rose-500/20 transition disabled:opacity-50"
                        >
                          {cancellingId === b.booking_id ? 'Cancelling...' : 'Cancel Booking'}
                        </button>
                      )}
                      {isConfirmed && isPast && (
                        <span className="text-xs text-slate-500 italic">Concluded</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
