import { writable } from 'svelte/store';

export interface CenterCompanyType {
	name: string;
	businessnumber: string;
	representative: string;
	address: string;
	cellnumber: string;
}

export class CenterCompanyInit {
	private _company = writable<CenterCompanyType>({
		name: '',
		businessnumber: '',
		representative: '',
		address: '',
		cellnumber: ''
	});

	get company() {
		return this._company;
	}

	setCompany(company: CenterCompanyType) {
		this._company.set(company);
	}

	updateCompany(partialCompany: Partial<CenterCompanyType>) {
		this._company.update((current) => ({
			...current,
			...partialCompany
		}));
	}

	resetCompany() {
		this._company.set({
			name: '',
			businessnumber: '',
			representative: '',
			address: '',
			cellnumber: ''
		});
	}
}
export const CenterCompany = new CenterCompanyInit();
