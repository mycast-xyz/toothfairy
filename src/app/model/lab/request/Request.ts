import { writable } from 'svelte/store';

/**
 * 환자 정보 표기(PatientInfo a book).
 * @param {string} uuid - 환자 고유번호: yyyymmdd-uuid(8자리).
 * @param {string} name - 환자 이름 .
 * @param {string} startDate - 의뢰서 작성일 : YYYY-mm-dd hh:mm:ss / 실표기 : YYYY-mm-dd.
 * @param {string} endDate - 작업 완료일 : YYYY-mm-dd hh:mm:ss / 실표기 : YYYY-mm-dd.
 * @param {string} sendCompany - 의뢰서 작성 병원.
 * @param {string} totalPrice - details 합계 수가.
 * @param {string[]} option - 제작 옵션 : 골드 / 모델리스 / CT이미지 / 구강스캔 이미지 등
 * @param {File | null} photoFile - [변경] 사용자가 업로드한 원본 사진 파일 객체.
 */
export interface PatientInfo {
	uuid: string | null;
	name: string;
	startDate: Date | string;
	endDate: Date | string;
	sendCompany: string;
	totalPrice: number;
	option: string[];
	photoFile: string | null; // [변경] 사진의 임시 URL 대신 File 객체를 직접 저장
}

export class PatientInfoInit {
	#patientInfo = writable<PatientInfo>({
		name: '',
		startDate: '',
		endDate: '',
		sendCompany: '',
		totalPrice: 0,
		option: [],
		uuid: null,
		photoFile: null // [변경] 초기값 설정
	});

	get patientInfo() {
		return this.#patientInfo;
	}

	setPatientInfo(patientInfo: PatientInfo) {
		this.#patientInfo.set(patientInfo);
	}

	updatePatientInfo(partialPatientInfo: Partial<PatientInfo>) {
		this.#patientInfo.update((current) => ({
			...current,
			...partialPatientInfo
		}));
	}

	/**
	 * [변경] 사용자가 선택한 사진 파일을 스토어에 직접 저장합니다.
	 * @param {File | null} file - 사용자가 input[type=file]에서 선택한 파일 객체.
	 */
	setPhotoFile(file: File | null) {
		this.#patientInfo.update((current) => ({
			...current,
			photoFile: file
		}));
	}

	resetPatientInfo() {
		this.#patientInfo.set({
			name: '',
			startDate: '',
			endDate: '',
			sendCompany: '',
			totalPrice: 0,
			option: [],
			uuid: null,
			photoFile: null // [변경] 리셋값 설정
		});
	}
}

// 클래스의 인스턴스를 export하여 싱글턴처럼 사용합니다.
export const patientInfoStore = new PatientInfoInit();
