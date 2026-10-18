'use client';

import React from 'react';
import { EventItem } from '../lib/types';
import { Calendar, MapPin, Users, Ticket, ArrowRight, CheckCircle2 } from 'lucide-react';

interface EventCardProps {
  event: EventItem;
  isBookedByMe?: boolean;
  onBook: (event: EventItem) => void;
  onViewDetails: (event: EventItem) => void;
  bookingLoading?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  isBookedByMe = false,
  onBook,
  onViewDetails,
  bookingLoading = false,
}) => {
  // Format Date & Time
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

  // Capacity pill logic
  const isPast = event.is_past;
  const isSoldOut = event.seats_left <= 0;
  const isNearlyFull = event.seats_left > 0 && event.seats_left <= 3;

  return (
    <div className="group glass-card rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden border border-slate-800/80 hover:border-indigo-500/40 transition-all duration-300">
      {/* Background ambient gradient glow on hover */}
      <div className="absolute -right-12 -top-12 w-36 h-36 bg-indigo-500/5 group-hover:bg-indigo-500/10 rounded-full blur-2xl transition duration-500 pointer-events-none" />

      <div>
        {/* Top meta tags */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="px-2.5 py-1 text-[11px] font-medium tracking-wide uppercase rounded-md bg-slate-800 text-slate-300 border border-slate-700/60">
            {event.category || 'General'}
          </span>

          {/* Seat Status Badge */}
          {isPast ? (
            <span className="px-2.5 py-1 text-xs font-medium rounded-full badge-slate">
              Past Event
            </span>
          ) : isSoldOut ? (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full badge-rose flex items-center gap-1">
              Sold Out
            </span>
          ) : isNearlyFull ? (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full badge-amber flex items-center gap-1 animate-pulse">
              Only {event.seats_left} seat{event.seats_left === 1 ? '' : 's'} left!
            </span>
          ) : (
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full badge-emerald flex items-center gap-1">
              {event.seats_left} seats available
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          onClick={() => onViewDetails(event)}
          className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2 cursor-pointer mb-2"
        >
          {event.title}
        </h3>

        {/* Description snippet */}
        <p className="text-xs sm:text-sm text-slate-400 line-clamp-2 mb-4 leading-relaxed">
          {event.description}
        </p>

        {/* Info Grid */}
        <div className="space-y-2 mb-5 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>
              {formattedDate} • <span className="text-slate-400">{formattedTime}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate text-slate-400">{event.venue}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-slate-400">
              Capacity: <span className="text-slate-200 font-medium">{event.total_seats}</span> seats (
              <span className="text-indigo-400 font-medium">{event.booked_seats}</span> booked)
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-slate-800/80 flex items-center gap-2">
        <button
          onClick={() => onViewDetails(event)}
          className="flex-1 py-2 px-3 text-xs font-medium rounded-xl text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700/70 border border-slate-700/60 transition"
        >
          Details
        </button>

        {isBookedByMe ? (
          <div className="py-2 px-3 text-xs font-medium rounded-xl bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 justify-center">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Booked</span>
          </div>
        ) : (
          <button
            onClick={() => onBook(event)}
            disabled={isPast || isSoldOut || bookingLoading}
            className={`py-2 px-4 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition ${
              isPast || isSoldOut
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/40'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 active:scale-95'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>{isPast ? 'Past Event' : isSoldOut ? 'Sold Out' : 'Book Seat'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
