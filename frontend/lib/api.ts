import {
  AuthResponse,
  EventDetailResponse,
  EventItem,
  EventsListResponse,
  BookingItem,
  AttendeesResponse,
  User
} from './types';

// Strip trailing slash so NEXT_PUBLIC_API_URL works with or without one
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

/**
 * Standard request helper with automatic JSON parsing and bearer token attachment
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('eventbook_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = null;
  }

  if (!response.ok) {
    const errorMessage = data?.error || data?.message || `Request failed with status ${response.status}`;
    const error = new Error(errorMessage) as any;
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data as T;
}

export const api = {
  // Auth API
  auth: {
    login: (credentials: { email: string; password: string }): Promise<AuthResponse> =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),

    register: (userData: { name: string; email: string; password: string }): Promise<AuthResponse> =>
      request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      }),

    me: (): Promise<{ user: User }> =>
      request('/auth/me'),
  },

  // Events API
  events: {
    list: (params: { page?: number; limit?: number; search?: string; filter?: string } = {}): Promise<EventsListResponse> => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set('page', params.page.toString());
      if (params.limit) searchParams.set('limit', params.limit.toString());
      if (params.search) searchParams.set('search', params.search);
      if (params.filter) searchParams.set('filter', params.filter);

      const qs = searchParams.toString();
      return request(`/events${qs ? `?${qs}` : ''}`);
    },

    get: (id: string): Promise<EventDetailResponse> =>
      request(`/events/${id}`),

    create: (data: {
      title: string;
      description: string;
      category: string;
      date_time: string;
      venue: string;
      total_seats: number;
    }): Promise<{ message: string; event: EventItem }> =>
      request('/events', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: (
      id: string,
      data: Partial<{
        title: string;
        description: string;
        category: string;
        date_time: string;
        venue: string;
        total_seats: number;
      }>
    ): Promise<{ message: string; event: EventItem }> =>
      request(`/events/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),

    delete: (id: string, force: boolean = false): Promise<{ message: string }> =>
      request(`/events/${id}${force ? '?force=true' : ''}`, {
        method: 'DELETE',
      }),

    getAttendees: (id: string): Promise<AttendeesResponse> =>
      request(`/events/${id}/attendees`),
  },

  // Bookings API
  bookings: {
    book: (eventId: string): Promise<{ message: string; booking: any; event: any }> =>
      request(`/events/${eventId}/book`, {
        method: 'POST',
      }),

    myBookings: (): Promise<{ bookings: BookingItem[]; total: number }> =>
      request('/bookings/my'),

    cancel: (bookingId: string): Promise<{ message: string; booking: any }> =>
      request(`/bookings/${bookingId}/cancel`, {
        method: 'POST',
      }),
  },
};
