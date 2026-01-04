import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	InvoicePageType,
	type PdfRenderRequest,
	type PdfRenderResponse
} from '../../../../app/model/invoice/InvoicePageType';
import axios from 'axios';

/**
 * PDF 렌더링 API 엔드포인트
 * Playwright 서버로 HTML을 전송하여 PDF를 생성합니다.
 */
export const POST: RequestHandler = async ({ request }) => {
	console.log('🚀 [PDF API] PDF 렌더링 요청 시작');

	try {
		const body = await request.json();
		const { pageType, data, options, htmlContent } = body as PdfRenderRequest & {
			htmlContent: string;
		};

		console.log('📋 [PDF API] 요청 데이터:', {
			pageType,
			hasData: !!data,
			hasOptions: !!options,
			htmlContentLength: htmlContent?.length || 0,
			fileName: options?.fileName
		});

		// 입력 데이터 검증
		if (!pageType || !data || !htmlContent) {
			console.error('❌ [PDF API] 필수 파라미터 누락:', {
				pageType: !!pageType,
				data: !!data,
				htmlContent: !!htmlContent
			});
			return json(
				{
					success: false,
					error: '필수 파라미터가 누락되었습니다. (pageType, data, htmlContent)'
				} as PdfRenderResponse,
				{ status: 400 }
			);
		}

		// 페이지 타입 검증
		if (!Object.values(InvoicePageType).includes(pageType)) {
			return json(
				{
					success: false,
					error: `지원하지 않는 페이지 타입: ${pageType}`
				} as PdfRenderResponse,
				{ status: 400 }
			);
		}

		// Playwright 서버 URL (환경변수에서 가져오거나 기본값 사용)
		const playwrightServerUrl =
			(globalThis as any).process?.env?.PLAYWRIGHT_SERVER_URL || 'http://localhost:3000';

		console.log('🔗 [PDF API] Playwright 서버 URL:', playwrightServerUrl);

		// PDF 렌더링 요청 데이터 구성
		const pdfRequestData = {
			html: htmlContent,
			options: {
				format: options?.format || 'A4',
				orientation: options?.orientation || 'portrait',
				scale: options?.scale || 1.0,
				margin: {
					top: '10mm',
					right: '10mm',
					bottom: '10mm',
					left: '10mm'
				},
				displayHeaderFooter: false,
				printBackground: true,
				preferCSSPageSize: false,
				width: '210mm',
				height: '297mm',
				waitUntil: 'domcontentloaded' // DOM 로딩 완료 시점으로 변경 (더 빠름)
			},
			metadata: {
				pageType,
				fileName:
					options?.fileName ||
					`${data.param?.date || 'invoice'}-${data.info?.companyname || 'company'}-${data.param?.item || 'item'}.pdf`,
				timestamp: new Date().toISOString()
			},
			// 폰트 로딩을 위한 추가 옵션
			waitFor: {
				selector: 'body',
				timeout: 15000 // 15초로 증가
			}
		};

		// 1단계: Playwright 서버로 PDF 생성 요청 (재시도 로직 포함)
		let renderResponse;
		let lastError;
		const maxRetries = 3;
		const retryDelay = 2000; // 2초

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				console.log(`🔄 [PDF API] PDF 렌더링 시도 ${attempt}/${maxRetries}`);
				console.log('📤 [PDF API] Playwright 서버로 요청 전송 중...');

				const startTime = Date.now();
				renderResponse = await axios.post(
					`${playwrightServerUrl}/api/v0/pdf/render`,
					pdfRequestData,
					{
						headers: {
							'Content-Type': 'application/json',
							'User-Agent': 'ToothFairy-PDF-Renderer/1.0'
						},
						timeout: 60000 // 60초로 증가
					}
				);

				const endTime = Date.now();
				console.log(`✅ [PDF API] PDF 렌더링 성공 (${endTime - startTime}ms)`);
				console.log('📊 [PDF API] 응답 데이터:', {
					status: renderResponse.status,
					success: renderResponse.data?.success,
					resultCode: renderResponse.data?.resultCode,
					fileName: renderResponse.data?.data?.fileName,
					fileSize: renderResponse.data?.data?.fileSize
				});

				// 성공하면 루프 종료
				break;
			} catch (error) {
				lastError = error;
				const axiosError = error as any;
				console.error(`❌ [PDF API] PDF 렌더링 시도 ${attempt} 실패:`, {
					message: axiosError.message,
					code: axiosError.code,
					status: axiosError.response?.status,
					statusText: axiosError.response?.statusText
				});

				// 마지막 시도가 아니면 잠시 대기 후 재시도
				if (attempt < maxRetries) {
					console.log(`⏳ [PDF API] ${retryDelay}ms 후 재시도...`);
					await new Promise((resolve) => setTimeout(resolve, retryDelay));
				}
			}
		}

		// 모든 시도가 실패한 경우
		if (!renderResponse) {
			throw lastError || new Error('PDF 렌더링에 실패했습니다.');
		}

		const renderResult = renderResponse.data;
		console.log('📋 [PDF API] Playwright 서버 응답:', renderResult);

		if (renderResult.resultCode === 200 && renderResult.success && renderResult.data) {
			// 성공적인 PDF 생성 응답 - 서버에서 제공하는 downloadUrl 사용
			console.log('🎉 [PDF API] PDF 생성 성공!');
			console.log('📄 [PDF API] PDF 정보:', {
				fileName: renderResult.data.fileName,
				fileSize: renderResult.data.fileSize,
				downloadUrl: `${playwrightServerUrl}${renderResult.data.downloadUrl}`
			});

			return json(
				{
					success: true,
					fileName: renderResult.data.fileName,
					downloadUrl: `${playwrightServerUrl}${renderResult.data.downloadUrl}`,
					fileSize: renderResult.data.fileSize,
					pageType: renderResult.data.pageType,
					timestamp: renderResult.data.timestamp
				} as PdfRenderResponse,
				{
					headers: {
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
						'Access-Control-Allow-Headers': 'Content-Type, Authorization'
					}
				}
			);
		} else {
			// PDF 생성 실패
			console.error('❌ [PDF API] PDF 생성 실패:', {
				resultCode: renderResult.resultCode,
				success: renderResult.success,
				error: renderResult.error
			});

			return json(
				{
					success: false,
					error: renderResult.error || `PDF 생성에 실패했습니다. (코드: ${renderResult.resultCode})`
				} as PdfRenderResponse,
				{ status: 500 }
			);
		}
	} catch (error) {
		console.error('💥 [PDF API] PDF 렌더링 API 오류:', error);

		// axios 에러 처리
		if (axios.isAxiosError(error)) {
			// 타임아웃 오류 처리
			if (error.code === 'ECONNABORTED') {
				return json(
					{
						success: false,
						error: 'PDF 생성 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.'
					} as PdfRenderResponse,
					{ status: 504 }
				);
			}

			// 네트워크 오류 처리
			if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
				return json(
					{
						success: false,
						error: 'PDF 생성 서버에 연결할 수 없습니다. 서버 상태를 확인해주세요.'
					} as PdfRenderResponse,
					{ status: 503 }
				);
			}

			// HTTP 상태 코드 오류
			if (error.response) {
				return json(
					{
						success: false,
						error: `PDF 렌더링 서버 오류: ${error.response.status} - ${error.response.data?.message || error.message}`
					} as PdfRenderResponse,
					{ status: 502 }
				);
			}
		}

		// 기타 오류
		return json(
			{
				success: false,
				error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
			} as PdfRenderResponse,
			{ status: 500 }
		);
	}
};

/**
 * GET 요청으로 서버 상태 확인
 */
export const GET: RequestHandler = async () => {
	const playwrightServerUrl =
		(globalThis as any).process?.env?.PLAYWRIGHT_SERVER_URL || 'http://localhost:3000';

	try {
		// Playwright 서버 상태 확인 - PDF 목록 조회로 헬스체크
		const listResponse = await axios.get(`${playwrightServerUrl}/api/v0/pdf/list`, {
			timeout: 5000
		});

		return json(
			{
				success: true,
				message: 'PDF 렌더링 서비스가 정상적으로 작동 중입니다.',
				playwrightServer: playwrightServerUrl,
				status: 'healthy',
				endpoints: {
					render: `${playwrightServerUrl}/api/v0/pdf/render`,
					download: `${playwrightServerUrl}/api/v0/pdf/download`,
					list: `${playwrightServerUrl}/api/v0/pdf/list`
				}
			},
			{
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization'
				}
			}
		);
	} catch (error) {
		// axios 에러 처리
		if (axios.isAxiosError(error)) {
			return json(
				{
					success: false,
					message: 'PDF 렌더링 서버에 연결할 수 없습니다.',
					playwrightServer: playwrightServerUrl,
					status: 'unreachable',
					error: error.response?.data?.message || error.message
				},
				{ status: 503 }
			);
		}

		return json(
			{
				success: false,
				message: 'PDF 렌더링 서버에 연결할 수 없습니다.',
				playwrightServer: playwrightServerUrl,
				status: 'unreachable',
				error: error instanceof Error ? error.message : '알 수 없는 오류'
			},
			{ status: 503 }
		);
	}
};
