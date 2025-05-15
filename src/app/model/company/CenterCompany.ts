import { writable } from 'svelte/store';
export interface CenterCompanyType {
	name: string;
	companyName: string;
	businessNumber: string;
	representative: string;
	address: string;
	cellnumber: string;
	item: string[];
	prices: {
		cap: { normal: number; remake: number };
		partial: { normal: number; remake: number };
		allonfour: { normal: number; remake: number };
		custom: { normal: number; remake: number };
	};
	deliveryFee: number;
	id: number;
}

export class CenterCompanyInit {
	#company = writable<CenterCompanyType>({
		name: '',
		companyName: '',
		businessNumber: '',
		representative: '',
		address: '',
		cellnumber: '',
		item: [],
		prices: {
			cap: { normal: 0, remake: 0 },
			partial: { normal: 0, remake: 0 },
			allonfour: { normal: 0, remake: 0 },
			custom: { normal: 0, remake: 0 }
		},
		deliveryFee: 0,
		id: 0
	});

	get company() {
		return this.#company;
	}

	setCompany(company: CenterCompanyType) {
		this.#company.set(company);
	}

	updateCompany(partialCompany: Partial<CenterCompanyType>) {
		this.#company.update((current) => ({
			...current,
			...partialCompany
		}));
	}

	resetCompany() {
		this.#company.set({
			name: '',
			companyName: '',
			businessNumber: '',
			representative: '',
			address: '',
			cellnumber: '',
			item: [],
			prices: {
				cap: { normal: 0, remake: 0 },
				partial: { normal: 0, remake: 0 },
				allonfour: { normal: 0, remake: 0 },
				custom: { normal: 0, remake: 0 }
			},
			deliveryFee: 0,
			id: 0
		});
	}
}
export const CenterCompany = new CenterCompanyInit();
