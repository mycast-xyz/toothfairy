declare global {
	interface Window {
		daum: {
			Postcode: new (options: any) => {
				open: (options?: any) => void;
				embed: (element: HTMLElement, options?: any) => void;
			};
		};
	}
}

export {};
