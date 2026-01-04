import { configService } from '../ConfigService';
import axios from 'axios';

export interface CalendarEvent {
	id?: string | number;
	calendarId: string;
	title: string;
	body?: string;
	start: Date | string; // tui.calendar expects implicit types, but we'll manage with standard Date or ISO string
	end: Date | string;
	isAllday?: boolean;
	category?: 'time' | 'allday' | 'milestone' | 'task';
	location?: string;
	state?: 'Busy' | 'Free';
	color?: string;
	backgroundColor?: string;
	dragBackgroundColor?: string;
	borderColor?: string;
	attendees?: string[];
	raw?: any; // For any extra data
}

class CalendarService {
	/**
	 * Get all events, optionally filtered by calendarId (team) and date range
	 */
	public async getEvents(params?: {
		calendarId?: string;
		start?: Date;
		end?: Date;
	}): Promise<CalendarEvent[]> {
		const endpoint = configService.getApiEndpoint('calendar', 'list');
		const backendUrl = configService.getBackendUrl();
		const fullUrl = `${backendUrl}${endpoint}`;

		try {
			const response = await axios.get(fullUrl, {
				params: {
					calendarId: params?.calendarId,
					start: params?.start?.toISOString(),
					end: params?.end?.toISOString()
				},
				withCredentials: true
			});

			if (response.data && response.data.data) {
				// Transform backend data if necessary (e.g. snake_case to camelCase if DB returns raw rows)
				// Assuming backend returns matching structure or we map it here
				return response.data.data.map((item: any) => ({
					...item,
					// Ensure dates are properly converted if needed, though tui handles ISO strings well
					start: item.start_time || item.start,
					end: item.end_time || item.end,
					isAllday: item.is_all_day || item.isAllday
				}));
			}
			return [];
		} catch (error) {
			console.error('Failed to fetch calendar events:', error);
			return [];
		}
	}

	public async createEvent(event: CalendarEvent): Promise<boolean> {
		const endpoint = configService.getApiEndpoint('calendar', 'create');
		const backendUrl = configService.getBackendUrl();
		const fullUrl = `${backendUrl}${endpoint}`;

		try {
			// Map frontend model to DB model if needed (camelCase -> snake_case)
			const payload = {
				...event,
				start_time: event.start,
				end_time: event.end,
				is_all_day: event.isAllday,
				calendar_id: event.calendarId
			};

			const response = await axios.post(fullUrl, payload, { withCredentials: true });
			return response.status === 200 || response.status === 201;
		} catch (error) {
			console.error('Failed to create event:', error);
			return false;
		}
	}

	public async updateEvent(id: string | number, event: Partial<CalendarEvent>): Promise<boolean> {
		let endpoint = configService.getApiEndpoint('calendar', 'update');
		endpoint = endpoint.replace(':id', id.toString());
		const backendUrl = configService.getBackendUrl();
		const fullUrl = `${backendUrl}${endpoint}`;

		try {
			const payload = {
				...event,
				start_time: event.start,
				end_time: event.end,
				is_all_day: event.isAllday,
				calendar_id: event.calendarId
			};

			const response = await axios.put(fullUrl, payload, { withCredentials: true });
			return response.status === 200;
		} catch (error) {
			console.error('Failed to update event:', error);
			return false;
		}
	}

	public async deleteEvent(id: string | number): Promise<boolean> {
		let endpoint = configService.getApiEndpoint('calendar', 'delete');
		endpoint = endpoint.replace(':id', id.toString());
		const backendUrl = configService.getBackendUrl();
		const fullUrl = `${backendUrl}${endpoint}`;

		try {
			const response = await axios.delete(fullUrl, { withCredentials: true });
			return response.status === 200;
		} catch (error) {
			console.error('Failed to delete event:', error);
			return false;
		}
	}
}

export const calendarService = new CalendarService();
