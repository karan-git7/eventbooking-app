'use client';

import React from 'react';
import { EventItem } from '../lib/types';
import { Calendar, MapPin, Users, Ticket, CheckCircle2 } from 'lucide-react';

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

  const isPast = event.is_past;
  const isSoldOut = event.seats_left <= 0;
  const isNearlyFull = event.seats_left > 0 && event.seats_left <= 3;

  return (
    <div className="event-card rounded-xl p-5 flex flex-col justify-between">
      <div>
        {/* Category & Status */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="px-2.5 py-0.5 text-[11px] font-medium tracking-wide uppercase rounded bg-slate-800 text-slate-300">
            {event.category || 'General'}
          </span>

          {isPast ? (
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full badge-slate">
              Past Event
            </span>
          ) : isSoldOut ? (
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full badge-rose">
              Sold Out
            </span>
          ) : isNearlyFull ? (
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full badge-amber">
              Only {event.seats_left} seat{event.seats_left === 1 ? '' : 's'} left
            </span>
          ) : (
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full badge-emerald">
              {event.seats_left} seats available
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          onClick={() => onViewDetails(event)}
          className="text-base font-semibold text-white hover:text-indigo-400 transition-colors line-clamp-2 cursor-pointer mb-2"
        >
          {event.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
          {event.description}
        </p>

        {/* Info list */}
        <div className="space-y-1.5 mb-5 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>
              {formattedDate} • <span className="text-slate-400">{formattedTime}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate text-slate-400">{event.venue}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-slate-400">
              Capacity: <span className="text-slate-200">{event.total_seats}</span> (
              <span className="text-indigo-400">{event.booked_seats}</span> booked)
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2">
        <button
          onClick={() => onViewDetails(event)}
          className="flex-1 py-1.5 px-3 text-xs font-medium rounded-lg text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 transition"
        >
          Details
        </button>

        {isBookedByMe ? (
          <div className="py-1.5 px-3 text-xs font-medium rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 justify-center">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Booked</span>
          </div>
        ) : (
          <button
            onClick={() => onBook(event)}
            disabled={isPast || isSoldOut || bookingLoading}
            className={`py-1.5 px-3.5 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition ${
              isPast || isSoldOut
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/40'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>{isPast ? 'Past' : isSoldOut ? 'Sold Out' : 'Book Seat'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
