import { writable, type Readable, type Writable } from 'svelte/store';
import type { ModalType } from '../model/window/ModalType';

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
