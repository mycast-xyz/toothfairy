import { writable, type Readable, type Writable } from 'svelte/store';
import type { ModalType } from '../model/window/ModalType';
import { configService, getBackendUrl } from './ConfigService';

class WindowServiceInit {
	#modal: Writable<ModalType | null> = writable(null);

	get modal(): Readable<ModalType | null> {
		return this.#modal;
	}

	openModal(modal: ModalType) {
		this.#modal.set(modal);
		ModalView.set(true);
	}

	closeModal() {
		this.#modal.set(null);
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
