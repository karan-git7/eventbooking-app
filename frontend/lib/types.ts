export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at?: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  category: string;
  date_time: string;
  venue: string;
  total_seats: number;
  booked_seats: number;
  seats_left: number;
  is_past: boolean;
  created_at: string;
  updated_at?: string;
}

export interface UserBooking {
  id: string;
  status: 'CONFIRMED' | 'CANCELLED';
  created_at: string;
}

export interface EventDetailResponse {
  event: EventItem;
  user_booking: UserBooking | null;
}

export interface BookingItem {
  booking_id: string;
  status: 'CONFIRMED' | 'CANCELLED';
  booked_at: string;
  status_updated_at?: string;
  event_id: string;
  event_title: string;
  event_description: string;
  event_category: string;
  event_date_time: string;
  event_venue: string;
  event_total_seats: number;
  is_past_event: boolean;
}

export interface AttendeeItem {
  booking_id: string;
  status: 'CONFIRMED' | 'CANCELLED';
  booked_at: string;
  user_id: string;
  name: string;
  email: string;
}

export interface AttendeesResponse {
  event: {
    id: string;
    title: string;
    total_seats: number;
    date_time: string;
  };
  total_attendees: number;
  attendees: AttendeeItem[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface EventsListResponse {
  events: EventItem[];
  pagination: PaginationMeta;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}
