'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { EventItem, PaginationMeta, UserBooking } from '../lib/types';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { EventCard } from '../components/EventCard';
import { EventDetailModal } from '../components/EventDetailModal';
import { AuthModal } from '../components/AuthModal';
import { MyBookingsModal } from '../components/MyBookingsModal';
import { AdminModal } from '../components/AdminModal';
import { ReviewerGuideModal } from '../components/ReviewerGuideModal';
import {
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Ticket,
} from 'lucide-react';

export default function Home() {
  const { user } = useAuth();

  // Events State
  const [events, setEvents] = useState<EventItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    total: 0,
    page: 1,
    limit: 6,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState<'upcoming' | 'all' | 'past'>('upcoming');
  const [currentPage, setCurrentPage] = useState(1);

  // User confirmed bookings map
  const [myBookedEvents, setMyBookedEvents] = useState<Record<string, boolean>>({});

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'register'>('login');

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [selectedUserBooking, setSelectedUserBooking] = useState<UserBooking | null>(null);

  const [myBookingsOpen, setMyBookingsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  // Reviewer Guide Popup (shows on every refresh, can be dismissed by clicking anywhere)
  const [reviewerModalOpen, setReviewerModalOpen] = useState(true);

  // Action toast
  const [bookingLoadingId, setBookingLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load user bookings
  const loadUserBookings = useCallback(async () => {
    if (!user) {
      setMyBookedEvents({});
      return;
    }
    try {
      const res = await api.bookings.myBookings();
      const map: Record<string, boolean> = {};
      res.bookings.forEach((b) => {
        if (b.status === 'CONFIRMED') {
          map[b.event_id] = true;
        }
      });
      setMyBookedEvents(map);
    } catch (err) {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    loadUserBookings();
  }, [loadUserBookings]);

  // Fetch Events from API
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.events.list({
        page: currentPage,
        limit: 6,
        search: debouncedSearch,
        filter,
      });
      setEvents(res.events);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err.message || 'Unable to connect to EventBook service.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, filter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Handle Booking
  const handleBook = async (event: EventItem) => {
    if (!user) {
      setAuthInitialTab('login');
      setAuthModalOpen(true);
      return;
    }

    setBookingLoadingId(event.id);
    try {
      const res = await api.bookings.book(event.id);
      showToast('success', res.message || 'Seat reserved successfully.');
      await Promise.all([fetchEvents(), loadUserBookings()]);
      if (selectedEvent && selectedEvent.id === event.id) {
        setSelectedUserBooking(res.booking);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to book seat.');
      throw err;
    } finally {
      setBookingLoadingId(null);
    }
  };

  // Handle Cancel Booking
  const handleCancelBooking = async (bookingId: string) => {
    try {
      const res = await api.bookings.cancel(bookingId);
      showToast('success', res.message || 'Booking cancelled.');
      await Promise.all([fetchEvents(), loadUserBookings()]);
      setSelectedUserBooking(null);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to cancel booking.');
      throw err;
    }
  };

  // View details modal
  const handleViewDetails = async (event: EventItem) => {
    setSelectedEvent(event);
    setSelectedUserBooking(null);
    setDetailModalOpen(true);

    try {
      const detail = await api.events.get(event.id);
      setSelectedEvent(detail.event);
      setSelectedUserBooking(detail.user_booking);
    } catch (e) {
      // fallback
    }
  };

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f17] text-slate-100">
      {/* Navigation */}
      <Navbar
        onOpenAuth={(tab = 'login') => {
          setAuthInitialTab(tab);
          setAuthModalOpen(true);
        }}
        onOpenMyBookings={() => setMyBookingsOpen(true)}
        onOpenAdmin={() => setAdminOpen(true)}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-xl border flex items-center gap-2.5 text-xs font-medium ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/90 border-rose-500/40 text-rose-200'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Simple & Clean Product Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
            Discover & Book Tech Events
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Browse upcoming workshops, conferences, and meetups. Reserve your seat instantly with live capacity updates.
          </p>
        </div>

        {/* Clean Search & Filter Controls */}
        <div className="bg-[#111724] border border-slate-800 rounded-xl p-3 sm:p-4 mb-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events by title..."
              className="w-full pl-9 pr-8 py-1.5 text-xs sm:text-sm bg-[#0b0f17] border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-xs text-slate-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-[#0b0f17] border border-slate-800/80 p-1 rounded-lg w-full sm:w-auto">
            <button
              onClick={() => { setFilter('upcoming'); setCurrentPage(1); }}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-medium transition ${
                filter === 'upcoming'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => { setFilter('all'); setCurrentPage(1); }}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-medium transition ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Events
            </button>
            <button
              onClick={() => { setFilter('past'); setCurrentPage(1); }}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs font-medium transition ${
                filter === 'past'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Past Events
            </button>
          </div>
        </div>

        {/* Events Grid */}
        {error ? (
          <div className="p-8 rounded-xl bg-rose-950/20 border border-rose-500/30 text-center text-rose-300">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold">Failed to load events</h3>
            <p className="text-xs text-rose-400/80 mt-1">{error}</p>
            <button
              onClick={fetchEvents}
              className="mt-3 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition"
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="rounded-xl p-5 bg-[#121826] border border-slate-800 animate-pulse space-y-3"
              >
                <div className="flex justify-between">
                  <div className="w-16 h-4 bg-slate-800 rounded" />
                  <div className="w-20 h-4 bg-slate-800 rounded-full" />
                </div>
                <div className="w-3/4 h-5 bg-slate-800 rounded" />
                <div className="w-full h-10 bg-slate-800/60 rounded" />
                <div className="space-y-1.5 pt-2">
                  <div className="w-1/2 h-3.5 bg-slate-800 rounded" />
                  <div className="w-2/3 h-3.5 bg-slate-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="py-16 text-center bg-[#111724] rounded-xl border border-slate-800 p-8">
            <Calendar className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-white">No Events Found</h3>
            <p className="text-xs text-slate-400 mt-1">
              {debouncedSearch
                ? `No events matching "${debouncedSearch}". Try another title.`
                : 'There are currently no events under this filter.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((ev) => (
              <EventCard
                key={ev.id}
                event={ev}
                isBookedByMe={!!myBookedEvents[ev.id]}
                bookingLoading={bookingLoadingId === ev.id}
                onBook={handleBook}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>
        )}

        {/* Server-Side Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-800">
            <span className="text-xs text-slate-400">
              Showing page <strong className="text-slate-200">{pagination.page}</strong> of{' '}
              <strong className="text-slate-200">{pagination.totalPages}</strong> ({pagination.total} events)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPrevPage || loading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => setCurrentPage(num)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition ${
                    currentPage === num
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                  }`}
                >
                  {num}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={!pagination.hasNextPage || loading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:bg-slate-800 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Production-Grade Footer */}
      <footer className="border-t border-slate-800 py-8 bg-[#0b0f17] text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-slate-300">EventBook</span>
            <span>— Discover, book, and attend memorable events.</span>
          </div>
          <div className="flex items-center gap-5 text-slate-400">
            <a href="#" className="hover:text-slate-200 transition">About</a>
            <a href="#" className="hover:text-slate-200 transition">Events</a>
            <a href="#" className="hover:text-slate-200 transition">Privacy Policy</a>
            <a href="#" className="hover:text-slate-200 transition">Terms of Service</a>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 pt-4 border-t border-slate-900 text-center text-slate-600 text-[11px]">
          © {new Date().getFullYear()} EventBook Inc. All rights reserved.
        </div>
      </footer>

      {/* Reviewer / Demo Accounts Popup (Appears on refresh, dismissed by clicking outside) */}
      <ReviewerGuideModal
        isOpen={reviewerModalOpen}
        onClose={() => setReviewerModalOpen(false)}
      />

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        initialTab={authInitialTab}
        onClose={() => setAuthModalOpen(false)}
      />

      <EventDetailModal
        isOpen={detailModalOpen}
        event={selectedEvent}
        userBooking={selectedUserBooking}
        onClose={() => setDetailModalOpen(false)}
        onBook={handleBook}
        onCancelBooking={handleCancelBooking}
        onRequireAuth={() => {
          setDetailModalOpen(false);
          setAuthInitialTab('login');
          setAuthModalOpen(true);
        }}
      />

      <MyBookingsModal
        isOpen={myBookingsOpen}
        onClose={() => setMyBookingsOpen(false)}
        onBookingCancelled={() => {
          fetchEvents();
          loadUserBookings();
        }}
      />

      <AdminModal
        isOpen={adminOpen}
        onClose={() => setAdminOpen(false)}
        onEventsUpdated={() => {
          fetchEvents();
          loadUserBookings();
        }}
      />
    </div>
  );
}
