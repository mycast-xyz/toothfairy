declare module 'dropzone' {
	export class Dropzone {
		element: HTMLElement;
		files: any[];
		listeners: any[];
		defaultOptions: any;
		options: any;
		previewsContainer: any;
		version: string;

		constructor(element: HTMLElement, options: any);
		on(event: string, callback: (file: any, ...args: any[]) => void): void;
		off(event: string): void;
		destroy(): void;
		addFile(file: any): void;
		removeFile(file: any): void;
		removeAllFiles(): void;
		enable(): void;
		disable(): void;
		resizeImage(
			file: any,
			width: number,
			height: number,
			resizeMethod: string,
			callback: Function
		): void;
		processQueue(): void;
		cancelUpload(file: any): void;
	}
}
