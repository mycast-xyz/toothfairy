import { writable, type Readable, type Writable } from 'svelte/store';
import type { ModalType } from '../model/window/ModalType';
import { configService, getBackendUrl } from './ConfigService';

class WindowServiceInit {
	#modal: Writable<ModalType | null> = writable(null);
	#modalData: Writable<any> = writable(null);

	get modal(): Readable<ModalType | null> {
		return this.#modal;
	}

	get modalData(): Readable<any> {
		return this.#modalData;
	}

	openModal(modal: ModalType, data?: any) {
		this.#modal.set(modal);
		this.#modalData.set(data || null);
		ModalView.set(true);
	}

	closeModal() {
		this.#modal.set(null);
		this.#modalData.set(null);
		ModalView.set(false);
	}
}

export const WindowService = new WindowServiceInit();
export const ModalView = writable(false);
export const currentUrl = writable('');

// 브라우저 환경에서만 URL 설정
if (typeof window !== 'undefined') {
	// ConfigService에서 백엔드 URL 가져오기
	currentUrl.set(getBackendUrl());
}
