import { writable } from 'svelte/store';

export class ContentManualModal {
	private _showModal = writable(true);

	get showModal() {
		return this._showModal;
	}

	/** 페이지 로드시 쿠키 확인 및 모달 표시 여부 설정 */
	checkModalCookie() {
		try {
			const cookies = document.cookie.split('; ');
			const modalCookie = cookies.find((row) => row.startsWith('hideContentViewModal='));

			if (modalCookie) {
				const [_, value] = modalCookie.split('=');
				this._showModal.set(value !== 'true');
			} else {
				this._showModal.set(true);
			}
		} catch (error) {
			console.error('Error checking modal cookie:', error);
			this._showModal.set(true);
		}
	}

	/**
	 * 다시 보지 않기 체크박스 이벤트 핸들러
	 * 체크시 30일간 유효한 쿠키 설정
	 */
	handleDontShowAgain(e: Event) {
		const checkbox = e.target as HTMLInputElement;
		if (checkbox.checked) {
			const expiryDate = new Date();
			expiryDate.setDate(expiryDate.getDate() + 30);
			document.cookie = `hideContentViewModal=true; expires=${expiryDate.toUTCString()}; path=/`;
		}
	}

	/** 모달 닫기 핸들러 */
	closeModal() {
		this._showModal.set(false);
	}
}
