import { writable } from 'svelte/store';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
	id: string;
	type: ToastType;
	message: string;
	duration?: number;
	visible: boolean;
}

const TOAST_LIMIT = 5;
const DEFAULT_DURATION = 3000;

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	const addToast = (message: string, type: ToastType = 'info', duration = DEFAULT_DURATION) => {
		const id = Math.random().toString(36).substring(2, 9);
		const toast: Toast = {
			id,
			type,
			message,
			duration,
			visible: true
		};

		update((toasts) => {
			const newToasts = [toast, ...toasts].slice(0, TOAST_LIMIT);
			if (duration !== Infinity) {
				setTimeout(() => {
					dismissToast(id);
				}, duration);
			}
			return newToasts;
		});
	};

	const dismissToast = (id: string) => {
		update((toasts) => toasts.map((t) => (t.id === id ? { ...t, visible: false } : t)));

		setTimeout(() => {
			update((toasts) => toasts.filter((t) => t.id !== id));
		}, 300); // 애니메이션을 위한 지연
	};

	return {
		subscribe,
		success: (message: string, duration?: number) => addToast(message, 'success', duration),
		error: (message: string, duration?: number) => addToast(message, 'error', duration),
		info: (message: string, duration?: number) => addToast(message, 'info', duration),
		warning: (message: string, duration?: number) => addToast(message, 'warning', duration),
		dismiss: dismissToast
	};
}

export const toastStore = createToastStore();
