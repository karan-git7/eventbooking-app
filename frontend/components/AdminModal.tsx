'use client';

import React, { useState, useEffect } from 'react';
import { EventItem, AttendeesResponse, AttendeeItem } from '../lib/types';
import { api } from '../lib/api';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Users,
  Shield,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
} from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventsUpdated: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  onEventsUpdated,
}) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Workshop');
  const [dateTime, setDateTime] = useState('');
  const [venue, setVenue] = useState('');
  const [totalSeats, setTotalSeats] = useState<number>(20);

  // Attendees Drawer
  const [selectedEventForAttendees, setSelectedEventForAttendees] = useState<EventItem | null>(null);
  const [attendeesData, setAttendeesData] = useState<AttendeesResponse | null>(null);
  const [attendeesLoading, setAttendeesLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAllEvents();
    }
  }, [isOpen]);

  const loadAllEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.events.list({ limit: 50, filter: 'all' });
      setEvents(res.events);
    } catch (err: any) {
      setError(err.message || 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setTitle('');
    setDescription('');
    setCategory('Workshop');
    // Default date: 7 days in future formatted for datetime-local
    const defaultDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    setDateTime(defaultDate.toISOString().slice(0, 16));
    setVenue('');
    setTotalSeats(20);
    setFormOpen(true);
    setError(null);
  };

  const openEditForm = (ev: EventItem) => {
    setIsEditing(true);
    setEditingId(ev.id);
    setTitle(ev.title);
    setDescription(ev.description);
    setCategory(ev.category || 'Workshop');
    const d = new Date(ev.date_time);
    setDateTime(d.toISOString().slice(0, 16));
    setVenue(ev.venue);
    setTotalSeats(ev.total_seats);
    setFormOpen(true);
    setError(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isEditing && editingId) {
        await api.events.update(editingId, {
          title,
          description,
          category,
          date_time: new Date(dateTime).toISOString(),
          venue,
          total_seats: Number(totalSeats),
        });
        setSuccess('Event updated successfully.');
      } else {
        await api.events.create({
          title,
          description,
          category,
          date_time: new Date(dateTime).toISOString(),
          venue,
          total_seats: Number(totalSeats),
        });
        setSuccess('New event created successfully.');
      }

      setFormOpen(false);
      await loadAllEvents();
      onEventsUpdated();
    } catch (err: any) {
      setError(err.message || 'Operation failed.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (ev: EventItem) => {
    const hasBookings = ev.booked_seats > 0;
    const confirmMsg = hasBookings
      ? `Warning: "${ev.title}" has ${ev.booked_seats} active confirmed booking(s). Deleting will cancel all attendee seats. Proceed?`
      : `Are you sure you want to delete event "${ev.title}"?`;

    if (!confirm(confirmMsg)) return;

    setError(null);
    setSuccess(null);
    try {
      await api.events.delete(ev.id, hasBookings);
      setSuccess(`Event "${ev.title}" deleted.`);
      await loadAllEvents();
      onEventsUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to delete event.');
    }
  };

  const viewAttendees = async (ev: EventItem) => {
    setSelectedEventForAttendees(ev);
    setAttendeesLoading(true);
    try {
      const data = await api.events.getAttendees(ev.id);
      setAttendeesData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load attendee list.');
    } finally {
      setAttendeesLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-3xl bg-[#101726] border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Administrator Event Console</h3>
              <p className="text-xs text-slate-400">
                Create, update, monitor attendee lists, and manage capacities
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openCreateForm}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Create Event</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Alert Banners */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Event List Table */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-purple-400 mb-3" />
              <p className="text-sm">Loading all events...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-3 px-3">Title & Category</th>
                    <th className="py-3 px-3">Date & Venue</th>
                    <th className="py-3 px-3">Capacity</th>
                    <th className="py-3 px-3">Booked / Left</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-900/40 transition">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white text-sm line-clamp-1">{ev.title}</div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                          {ev.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        <div>
                          {new Date(ev.date_time).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-slate-400 text-[11px] truncate max-w-[180px]">
                          {ev.venue}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-200 font-medium">
                        {ev.total_seats} total
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-indigo-400 font-medium">{ev.booked_seats} booked</span>
                        <span className="text-slate-400"> • </span>
                        <span className={ev.seats_left === 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                          {ev.seats_left} left
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Attendees View Button */}
                          <button
                            onClick={() => viewAttendees(ev)}
                            className="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 border border-indigo-500/20 transition"
                            title="View attendee list"
                          >
                            <Users className="w-4 h-4" />
                          </button>
                          {/* Edit Button */}
                          <button
                            onClick={() => openEditForm(ev)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/50 transition"
                            title="Edit event"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {/* Delete Button */}
                          <button
                            onClick={() => handleDelete(ev)}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-500/20 transition"
                            title="Delete event"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create / Edit Form Modal Sub-layer */}
        {formOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl bg-[#101726] border border-slate-800 shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h4 className="text-base font-bold text-white">
                  {isEditing ? 'Edit Event' : 'Create New Event'}
                </h4>
                <button
                  onClick={() => setFormOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Event Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Distributed Systems Summit"
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-purple-500"
                    >
                      <option value="Workshop">Workshop</option>
                      <option value="Conference">Conference</option>
                      <option value="Meetup">Meetup</option>
                      <option value="Concert">Concert</option>
                      <option value="General">General</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">
                      Total Seats (Rule 5 Enforced)
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={totalSeats}
                      onChange={(e) => setTotalSeats(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={dateTime}
                      onChange={(e) => setDateTime(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Venue / Location</label>
                    <input
                      type="text"
                      required
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      placeholder="e.g. Tech Hub, Room 101"
                      className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Description</label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Full event description, schedule, and attendee expectations..."
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium shadow-md shadow-purple-600/20 disabled:opacity-50"
                  >
                    {formLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Attendees Drawer / View Modal */}
        {selectedEventForAttendees && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-3xl bg-[#101726] border border-slate-800 shadow-2xl p-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    Attendee Roster (Rule 6 Admin View)
                  </h4>
                  <p className="text-xs text-slate-400">
                    Event: <span className="text-slate-200">{selectedEventForAttendees.title}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedEventForAttendees(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 overflow-y-auto flex-1">
                {attendeesLoading ? (
                  <div className="py-12 flex justify-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  </div>
                ) : !attendeesData || attendeesData.attendees.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No confirmed attendees have registered for this event yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-400 mb-2">
                      Total Confirmed Attendees: {attendeesData.total_attendees}
                    </div>
                    {attendeesData.attendees.map((att) => (
                      <div
                        key={att.booking_id}
                        className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-white">{att.name}</div>
                          <div className="text-slate-400 text-[11px]">{att.email}</div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded-full badge-emerald text-[10px] font-semibold">
                            {att.status}
                          </span>
                          <div className="text-slate-400 text-[10px] mt-1">
                            Booked: {new Date(att.booked_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
