# Playwright PDF 렌더링 시스템

이 문서는 ToothFairy 프로젝트에서 Playwright를 사용한 PDF 렌더링 시스템에 대한 설명입니다.

## 개요

기존의 클라이언트 사이드 PDF 생성 방식(html2canvas + jsPDF)을 대체하여, 별도의 Playwright 서버에서 고품질 PDF를 생성하는 시스템입니다.

## 시스템 구조

```
┌─────────────────┐    HTTP POST    ┌──────────────────┐    Playwright    ┌─────────────────┐
│   Svelte App    │ ──────────────► │  API Router      │ ──────────────► │ Playwright      │
│                 │                 │  /api/pdf/render │                 │ Server          │
│ InvoicePdfRenderer │               │                  │                 │                 │
└─────────────────┘                 └──────────────────┘                 └─────────────────┘
```

## 주요 컴포넌트

### 1. InvoicePageType.ts

- 인보이스 페이지 타입 정의
- PDF 렌더링 요청/응답 인터페이스

### 2. InvoicePdfRenderer.svelte

- PDF 렌더링을 위한 통합 컴포넌트
- 페이지 타입에 따른 적절한 인보이스 컴포넌트 선택
- HTML 최적화 및 서버 전송

### 3. API Router (/api/pdf/render)

- Playwright 서버로의 요청 중계
- 에러 처리 및 응답 관리

## 설정

### 환경변수

`.env` 파일에 다음 환경변수를 설정하세요:

```env
# Playwright 서버 URL
PLAYWRIGHT_SERVER_URL=http://localhost:3001

# 개발 환경
PLAYWRIGHT_SERVER_URL=http://localhost:3001

# 프로덕션 환경
PLAYWRIGHT_SERVER_URL=https://your-playwright-server.com
```

### Playwright 서버 요구사항

Playwright 서버는 다음 엔드포인트를 제공해야 합니다:

#### POST /api/v0/pdf/render

HTML을 PDF로 변환합니다.

```typescript
interface PdfRenderRequest {
	html: string;
	options: {
		format: 'A4' | 'A3' | 'Letter';
		orientation: 'portrait' | 'landscape';
		scale: number;
		margin: {
			top: string;
			right: string;
			bottom: string;
			left: string;
		};
		displayHeaderFooter: boolean;
		printBackground: boolean;
	};
	metadata: {
		pageType: string;
		fileName: string;
		timestamp: string;
	};
}

interface PdfRenderResponse {
	success: boolean;
	fileName?: string;
	error?: string;
}
```

#### GET /api/v0/pdf/download/:fileName

생성된 PDF 파일을 다운로드합니다.

**응답**: PDF 파일 바이너리 데이터

#### GET /api/v0/pdf/list

생성된 PDF 목록을 조회합니다.

```typescript
interface PdfListResponse {
	success: boolean;
	files?: Array<{
		fileName: string;
		createdAt: string;
		size: number;
	}>;
	error?: string;
}
```

## 사용법

### 1. 기본 사용법

```svelte
<script>
	import InvoicePdfRenderer from './InvoicePdfRenderer.svelte';
	import { InvoicePageType } from './InvoicePageType';

	let showPdfRenderer = writable(false);
	let pdfRendererRef = $state(null);

	function openPdfModal() {
		showPdfRenderer.set(true);
	}

	function handlePdfRenderComplete(success, error) {
		showPdfRenderer.set(false);
		if (!success && error) {
			alert(`PDF 생성 오류: ${error}`);
		}
	}
</script>

<button onclick={openPdfModal}>PDF 다운로드</button>

{#if $showPdfRenderer}
	<InvoicePdfRenderer
		bind:this={pdfRendererRef}
		pageType={InvoicePageType.CAP}
		data={invoiceData}
		fileName="invoice.pdf"
		onRenderComplete={handlePdfRenderComplete}
	/>
{/if}
```

### 2. 지원되는 페이지 타입

- `InvoicePageType.CAP`: 캡 인보이스
- `InvoicePageType.CUSTOM`: 커스텀 인보이스
- `InvoicePageType.PARTIAL`: 부분 인보이스

## API 엔드포인트

### POST /api/pdf/render

PDF 렌더링 요청을 처리합니다.

**요청 본문:**

```json
{
	"pageType": "cap",
	"data": {
		/* 인보이스 데이터 */
	},
	"options": {
		"fileName": "invoice.pdf",
		"format": "A4",
		"orientation": "portrait",
		"scale": 1.0
	},
	"htmlContent": "<html>...</html>"
}
```

**응답:**

```json
{
	"success": true,
	"fileName": "invoice.pdf",
	"downloadUrl": "http://localhost:3001/api/v0/pdf/download/invoice.pdf"
}
```

### GET /api/pdf/render

PDF 렌더링 서비스 상태를 확인합니다.

**응답:**

```json
{
	"success": true,
	"message": "PDF 렌더링 서비스가 정상적으로 작동 중입니다.",
	"playwrightServer": "http://localhost:3001",
	"status": "healthy",
	"endpoints": {
		"render": "http://localhost:3001/api/v0/pdf/render",
		"download": "http://localhost:3001/api/v0/pdf/download",
		"list": "http://localhost:3001/api/v0/pdf/list"
	}
}
```

## 에러 처리

시스템은 다음과 같은 에러 상황을 처리합니다:

- **400 Bad Request**: 필수 파라미터 누락
- **502 Bad Gateway**: Playwright 서버 오류
- **503 Service Unavailable**: Playwright 서버 연결 불가
- **504 Gateway Timeout**: PDF 생성 시간 초과

## 장점

1. **고품질 PDF**: Playwright의 네이티브 PDF 생성 기능 활용
2. **서버 리소스 절약**: 클라이언트 브라우저 리소스 사용 최소화
3. **확장성**: 별도 서버로 분리하여 독립적 스케일링 가능
4. **일관성**: 모든 브라우저에서 동일한 PDF 품질 보장

## 주의사항

1. Playwright 서버가 실행 중이어야 합니다
2. 네트워크 연결이 필요합니다
3. PDF 생성 시간이 기존 방식보다 오래 걸릴 수 있습니다
4. 서버 리소스 사용량이 증가합니다

## 문제 해결

### PDF가 이미지처럼 나오는 문제

1. **HTML 미리보기 확인**: "HTML 미리보기" 버튼으로 렌더링될 HTML 확인
2. **폰트 로딩 문제**: Google Fonts 링크가 제대로 로드되는지 확인
3. **스타일 충돌**: Svelte 특수 속성들이 제거되는지 확인
4. **렌더링 대기 시간**: DOM과 스타일이 완전히 로드될 때까지 충분한 시간 대기
5. **Tailwind CSS 로딩**: CDN에서 Tailwind CSS가 완전히 로드될 때까지 대기 (3초)

### Tailwind CSS 스타일이 적용되지 않는 문제

1. **CDN 로딩 확인**: Tailwind CSS CDN이 제대로 로드되는지 확인
2. **강제 스타일 적용**: 인라인 CSS로 Tailwind 클래스들을 강제 적용
3. **렌더링 대기 시간**: Tailwind CSS 로딩을 위해 충분한 대기 시간 설정
4. **Playwright 서버 설정**: `waitUntil: 'networkidle0'` 옵션으로 네트워크 안정화 대기

### PDF 생성 실패

1. Playwright 서버 상태 확인: `GET /api/pdf/render`
2. 네트워크 연결 확인
3. 환경변수 `PLAYWRIGHT_SERVER_URL` 설정 확인

### 타임아웃 오류

1. Playwright 서버 성능 확인
2. HTML 복잡도 검토
3. 타임아웃 설정 조정 (현재 30초)

### 디버깅 팁

- **HTML 미리보기**: PDF 생성 전에 HTML이 올바르게 렌더링되는지 확인
- **브라우저 개발자 도구**: 네트워크 탭에서 폰트 로딩 상태 확인
- **Playwright 서버 로그**: 서버 측에서 HTML 처리 과정 확인

## 개발 가이드

### 새로운 인보이스 타입 추가

1. `InvoicePageType.ts`에 새로운 타입 추가
2. `InvoicePdfRenderer.svelte`의 `getInvoiceComponent()` 함수에 케이스 추가
3. 해당 인보이스 컴포넌트에 PDF 렌더링 기능 통합

### Playwright 서버 개발

Playwright 서버는 Node.js + Express + Playwright로 구현하는 것을 권장합니다.

```javascript
// 예시 Playwright 서버 구조
const express = require('express');
const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

const app = express();
app.use(express.json());

// PDF 파일 저장 디렉토리
const PDF_DIR = './pdfs';

// 1. HTML을 PDF로 변환
app.post('/api/v0/pdf/render', async (req, res) => {
	try {
		const { html, options, metadata, waitFor } = req.body;

		const browser = await chromium.launch();
		const page = await browser.newPage();

		// HTML 콘텐츠 설정
		await page.setContent(html, {
			waitUntil: options.waitUntil || 'networkidle0'
		});

		// Tailwind CSS 로딩 대기
		if (waitFor) {
			try {
				await page.waitForSelector(waitFor.selector, {
					timeout: waitFor.timeout || 10000
				});
			} catch (e) {
				console.warn('WaitFor selector timeout:', e.message);
			}
		}

		// 추가 대기 시간 (Tailwind CSS 완전 로딩)
		await page.waitForTimeout(2000);

		const pdf = await page.pdf(options);

		// PDF 파일 저장
		const fileName = metadata.fileName;
		const filePath = path.join(PDF_DIR, fileName);

		// 디렉토리가 없으면 생성
		await fs.mkdir(PDF_DIR, { recursive: true });
		await fs.writeFile(filePath, pdf);

		await browser.close();

		res.json({
			success: true,
			fileName
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message
		});
	}
});

// 2. PDF 파일 다운로드
app.get('/api/v0/pdf/download/:fileName', async (req, res) => {
	try {
		const fileName = req.params.fileName;
		const filePath = path.join(PDF_DIR, fileName);

		// 파일 존재 확인
		await fs.access(filePath);

		res.setHeader('Content-Type', 'application/pdf');
		res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

		const fileBuffer = await fs.readFile(filePath);
		res.send(fileBuffer);
	} catch (error) {
		res.status(404).json({
			success: false,
			error: '파일을 찾을 수 없습니다.'
		});
	}
});

// 3. PDF 목록 조회
app.get('/api/v0/pdf/list', async (req, res) => {
	try {
		const files = await fs.readdir(PDF_DIR);
		const fileList = [];

		for (const file of files) {
			const filePath = path.join(PDF_DIR, file);
			const stats = await fs.stat(filePath);

			fileList.push({
				fileName: file,
				createdAt: stats.birthtime.toISOString(),
				size: stats.size
			});
		}

		res.json({
			success: true,
			files: fileList
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message
		});
	}
});
```
