<script lang="ts">
	import { onMount } from 'svelte';
	import { InvoicePageType, type PdfRenderRequest } from '../../model/invoice/InvoicePageType';
	import {
		savePdfToDatabase,
		preparePdfSaveData,
		invoiceMoney,
		deliveryInvoice
	} from '../../service/invoice/InvoiceViewStore';
	import CapInvoicePdf from './pdf/CapInvoicePdf.svelte';
	import CustomInvoicePdf from './pdf/CustomInvoicePdf.svelte';
	import PartialInvoicePdf from './pdf/PartialInvoicePdf.svelte';

	interface Props {
		pageType: InvoicePageType;
		data: any;
		fileName?: string;
		onRenderComplete?: (success: boolean, error?: string) => void;
	}

	const { pageType, data, fileName, onRenderComplete }: Props = $props();

	let containerElement: HTMLElement;
	let isRendered = $state(false);

	// 페이지 타입에 따른 컴포넌트 선택
	function getInvoiceComponent() {
		switch (pageType) {
			case InvoicePageType.CAP:
				return CapInvoicePdf;
			case InvoicePageType.CUSTOM:
				return CustomInvoicePdf;
			case InvoicePageType.PARTIAL:
				return PartialInvoicePdf;
			case InvoicePageType.ALLONFOUR:
				return PartialInvoicePdf; // 파샬과 비슷하므로 같은 컴포넌트 사용
			default:
				throw new Error(`지원하지 않는 페이지 타입: ${pageType}`);
		}
	}

	// PDF 렌더링을 위한 HTML 생성
	async function generateHtmlForPdf(): Promise<string> {
		if (!containerElement) {
			throw new Error('컨테이너 요소를 찾을 수 없습니다.');
		}

		// DOM을 복제하여 원본에 영향을 주지 않음
		const clonedElement = containerElement.cloneNode(true) as HTMLElement;

		// HTML 내용을 가져와서 PDF 렌더링에 최적화
		let htmlContent = clonedElement.innerHTML;

		// Svelte 특수 속성들 제거
		htmlContent = htmlContent
			.replace(/\sdata-svelte-\w+="[^"]*"/g, '')
			.replace(/\sclass:svelte-\w+="[^"]*"/g, '')
			.replace(/<!--.*?-->/gs, '');

		// PDF 렌더링을 위한 최적화된 HTML 생성
		const pageTitle = fileName || 'Invoice';
		const headContent = getHeadContent(pageTitle);
		const bodyContent = getBodyContent(htmlContent);
		const optimizedHtml = headContent + bodyContent;

		return optimizedHtml;
	}

	// HTML 헤드 콘텐츠 생성
	function getHeadContent(pageTitle: string): string {
		const scriptTag = '<' + 'script src="https://cdn.tailwindcss.com"></' + 'script>';

		return (
			'<!DOCTYPE html>' +
			'<html lang="ko">' +
			'<head>' +
			'<meta charset="UTF-8">' +
			'<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
			'<title>' +
			pageTitle +
			'</title>' +
			'<link rel="preconnect" href="https://fonts.googleapis.com">' +
			'<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
			'<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">' +
			//tailwindCSS +
			scriptTag +
			'</head>'
		);
	}

	// HTML 바디 콘텐츠 생성
	function getBodyContent(htmlContent: string): string {
		return (
			'<body>' + '<div class="invoice-container">' + htmlContent + '</div>' + '</body>' + '</html>'
		);
	}

	// PDF 다운로드 및 데이터베이스 저장 함수
	async function downloadPdf(url: string, fileName: string): Promise<void> {
		console.log('📥 [PDF 다운로드] 함수 시작');
		console.log('🔗 PDF URL:', url);
		console.log('📄 파일명:', fileName);

		try {
			// fetch를 사용하여 PDF 파일을 가져옴
			console.log('🌐 PDF 파일 요청 중...');
			const response = await fetch(url, {
				method: 'GET',
				headers: {
					Accept: 'application/pdf'
				}
			});

			console.log('📡 PDF 응답 상태:', response.status, response.statusText);
			console.log('📊 응답 헤더:', Object.fromEntries(response.headers.entries()));

			if (!response.ok) {
				console.error('❌ PDF 다운로드 실패:', response.status, response.statusText);
				throw new Error(`PDF 다운로드 실패: ${response.status} ${response.statusText}`);
			}

			// Blob으로 변환
			console.log('🔄 Blob 변환 중...');
			const blob = await response.blob();
			const fileSize = blob.size;
			console.log('📊 파일 크기:', fileSize, 'bytes');
			console.log('📋 Blob 타입:', blob.type);

			// Blob URL 생성
			console.log('🔗 Blob URL 생성 중...');
			const blobUrl = window.URL.createObjectURL(blob);
			console.log('🔗 생성된 Blob URL:', blobUrl);

			// 다운로드 링크 생성 및 클릭
			console.log('🔗 다운로드 링크 생성 중...');
			const link = document.createElement('a');
			link.href = blobUrl;
			link.download = fileName;
			link.style.display = 'none';

			document.body.appendChild(link);
			console.log('👆 다운로드 링크 클릭...');
			link.click();
			document.body.removeChild(link);

			// 메모리 정리
			console.log('🧹 메모리 정리 중...');
			window.URL.revokeObjectURL(blobUrl);

			console.log('✅ PDF 다운로드 완료:', fileName);

			// 데이터베이스에 PDF 정보 저장
			console.log('💾 데이터베이스 저장 시작...');
			await savePdfInfoToDatabase(fileName, fileSize, blob);
		} catch (error) {
			console.error('💥 PDF 다운로드 오류:', error);
			console.error('🔍 오류 상세:', {
				message: error instanceof Error ? error.message : '알 수 없는 오류',
				stack: error instanceof Error ? error.stack : undefined,
				url,
				fileName
			});
			throw new Error(
				`PDF 다운로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
			);
		}
	}

	// PDF 정보를 데이터베이스에 저장하는 함수
	async function savePdfInfoToDatabase(
		fileName: string,
		fileSize: number,
		blob: Blob
	): Promise<void> {
		console.log('🔍 [PDF 저장] 함수 시작');
		console.log('📄 파일명:', fileName);
		console.log('📊 파일 크기:', fileSize, 'bytes');
		console.log('📋 페이지 타입:', pageType);
		console.log('📦 데이터 객체:', data);

		try {
			// 파일 경로 생성 (실제 서버 경로에 맞게 수정 필요)
			const filePath = `/pdfs/${fileName}`;
			console.log('📁 파일 경로:', filePath);

			// 회사명 추출 (data에서 가져오기)
			const companyName = data?.param?.companyName || data?.corpInfo?.corp_name || 'Unknown';
			console.log('🏢 회사명:', companyName);

			// 인보이스 날짜 추출
			const invoiceDate = data?.param?.date || new Date().toISOString().split('T')[0];
			console.log('📅 인보이스 날짜:', invoiceDate);

			// PDF 저장 데이터 준비
			console.log('🔄 PDF 저장 데이터 준비 중...');
			const pdfSaveData = preparePdfSaveData(
				fileName,
				filePath,
				fileSize,
				pageType,
				companyName,
				invoiceDate,
				'current_user', // 실제 사용자 정보로 교체 필요
				data?.param?.corp_id,
				data?.param?.invoiceId
			);
			console.log('📋 준비된 PDF 저장 데이터:', pdfSaveData);

			// 스토어에서 현재 값들을 추가로 설정
			console.log(
				'💰 스토어 값들 - invoiceMoney:',
				$invoiceMoney,
				'deliveryInvoice:',
				$deliveryInvoice
			);
			if (pdfSaveData.invoiceData) {
				pdfSaveData.invoiceData.invoiceMoney = $invoiceMoney;
				pdfSaveData.invoiceData.deliveryInvoice = $deliveryInvoice;
				console.log('✅ 스토어 값들이 PDF 데이터에 추가됨');
			} else {
				console.warn('⚠️ PDF 데이터에 invoiceData가 없습니다.');
			}

			// 데이터베이스에 저장
			console.log('🚀 백엔드 서버로 데이터 전송 시작...');
			const result = await savePdfToDatabase(pdfSaveData);
			console.log('📡 백엔드 응답:', result);

			if (result.success) {
				console.log('✅ PDF 정보가 데이터베이스에 성공적으로 저장되었습니다.');
			} else {
				console.error('❌ PDF 정보 저장 실패:', result.error);
				// 저장 실패해도 다운로드는 성공했으므로 에러를 던지지 않음
			}
		} catch (error) {
			console.error('💥 PDF 정보 저장 중 오류 발생:', error);
			console.error('🔍 오류 상세:', {
				message: error instanceof Error ? error.message : '알 수 없는 오류',
				stack: error instanceof Error ? error.stack : undefined,
				fileName,
				fileSize,
				pageType
			});
			// 저장 실패해도 다운로드는 성공했으므로 에러를 던지지 않음
		}
	}

	// 서버로 PDF 렌더링 요청 전송 (재시도 로직 포함)
	async function sendPdfRenderRequest(): Promise<void> {
		const maxRetries = 3;
		const retryDelay = 3000; // 3초
		let lastError;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				console.log(`PDF 렌더링 요청 시도 ${attempt}/${maxRetries}`);

				// HTML 생성 과정 로깅
				console.log('HTML 생성 시작...');
				const htmlContent = await generateHtmlForPdf();
				console.log('HTML 생성 완료, 크기:', htmlContent.length, 'bytes');

				const requestData: PdfRenderRequest = {
					pageType,
					data,
					options: {
						fileName:
							fileName || `${data.param.date}-${data.info.companyname}-${data.param.item}.pdf`,
						format: 'A4',
						orientation: 'portrait',
						scale: 1.0
					}
				};

				const response = await fetch('/api/pdf/render', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						...requestData,
						htmlContent
					})
				});

				console.log(
					`PDF 렌더링 요청 응답 (시도 ${attempt}):`,
					response.status,
					response.statusText
				);

				if (!response.ok) {
					const errorText = await response.text();
					throw new Error(
						`PDF 렌더링 요청 실패: ${response.status} ${response.statusText} - ${errorText}`
					);
				}

				const result = await response.json();

				if (result.success && result.downloadUrl) {
					// PDF 다운로드 처리
					await downloadPdf(result.downloadUrl, result.fileName || fileName || 'invoice.pdf');
					onRenderComplete?.(true);
					return; // 성공하면 함수 종료
				} else {
					throw new Error(result.error || 'PDF 생성에 실패했습니다.');
				}
			} catch (error) {
				lastError = error;
				console.error(`PDF 렌더링 시도 ${attempt} 오류:`, error);

				// 마지막 시도가 아니면 잠시 대기 후 재시도
				if (attempt < maxRetries) {
					console.log(`${retryDelay}ms 후 재시도...`);
					await new Promise((resolve) => setTimeout(resolve, retryDelay));
				}
			}
		}

		// 모든 시도가 실패한 경우
		console.error('PDF 렌더링 최종 실패:', lastError);
		onRenderComplete?.(
			false,
			lastError instanceof Error
				? lastError.message
				: 'PDF 생성에 실패했습니다. 잠시 후 다시 시도해주세요.'
		);
	}

	// 컴포넌트 마운트 후 렌더링 완료 표시 및 자동 PDF 생성
	onMount(async () => {
		isRendered = true;

		// 렌더링 완료 후 충분한 시간 대기 (스타일 로딩 및 DOM 완성 대기)
		setTimeout(async () => {
			try {
				// 1. DOM 업데이트 대기
				await new Promise((resolve) => requestAnimationFrame(resolve));

				// 2. 반응형 변수들이 업데이트될 시간 추가 대기
				await new Promise((resolve) => setTimeout(resolve, 500));

				// 3. 폰트 로딩 대기
				if (document.fonts && document.fonts.ready) {
					await document.fonts.ready;
				}

				// 4. Tailwind CSS CDN 로딩 대기 (더 긴 시간 필요)
				await new Promise((resolve) => setTimeout(resolve, 3000));

				// 5. 최종 DOM 안정화 대기
				await new Promise((resolve) => requestAnimationFrame(resolve));

				await sendPdfRenderRequest();
			} catch (error) {
				console.error('PDF 렌더링 준비 중 오류:', error);
				onRenderComplete?.(false, 'PDF 렌더링 준비 중 오류가 발생했습니다.');
			}
		}, 1000); // 초기 대기 시간을 1초로 단축
	});

	// 외부에서 호출할 수 있는 함수들
	export function renderPdf(): Promise<void> {
		return sendPdfRenderRequest();
	}

	export function getHtmlContent(): Promise<string> {
		return generateHtmlForPdf();
	}

	// 디버깅용: HTML 미리보기 창 열기
	export function previewHtml(): void {
		generateHtmlForPdf()
			.then((html) => {
				const newWindow = window.open(
					'',
					'_blank',
					'width=800,height=600,scrollbars=yes,resizable=yes'
				);
				if (newWindow) {
					newWindow.document.write(html);
					newWindow.document.close();

					// 미리보기 창에 제목 설정
					newWindow.document.title = `PDF 미리보기 - ${fileName || 'Invoice'}`;

					// 콘솔에 HTML 내용 출력 (디버깅용)
					console.log('Generated HTML for PDF:', html);
				}
			})
			.catch((error) => {
				console.error('HTML 미리보기 생성 오류:', error);
				alert(`HTML 미리보기 생성 오류: ${error.message}`);
			});
	}

	// 디버깅용: 현재 DOM 상태 확인
	export function debugDomState(): void {
		if (!containerElement) {
			console.log('컨테이너 요소가 아직 준비되지 않았습니다.');
			return;
		}

		console.log('=== DOM 상태 디버깅 ===');
		console.log('컨테이너 요소:', containerElement);
		console.log('컨테이너 HTML:', containerElement.innerHTML);
		console.log('컨테이너 클래스:', containerElement.className);
		console.log('컨테이너 스타일:', containerElement.getAttribute('style'));

		// 모든 요소의 클래스와 스타일 확인
		const allElements = containerElement.querySelectorAll('*');
		console.log(`총 ${allElements.length}개의 요소 발견`);

		allElements.forEach((el, index) => {
			const htmlEl = el as HTMLElement;
			if (htmlEl.className || htmlEl.getAttribute('style')) {
				console.log(`요소 ${index}:`, {
					tagName: htmlEl.tagName,
					className: htmlEl.className,
					style: htmlEl.getAttribute('style'),
					textContent: htmlEl.textContent?.substring(0, 50) + '...'
				});
			}
		});
	}
</script>

<div bind:this={containerElement} class="invoice-pdf-renderer">
	{#if isRendered}
		{@const InvoiceComponent = getInvoiceComponent()}
		<InvoiceComponent {data} invoiceMoney={$invoiceMoney} deliveryInvoice={$deliveryInvoice} />
	{/if}
</div>

<style>
	.invoice-pdf-renderer {
		width: 100%;
		background: white;
	}

	/* PDF 렌더링을 위한 최적화 */
	:global(.invoice-pdf-renderer *) {
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
	}
</style>
