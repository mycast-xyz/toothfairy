# 배포 가이드

## 📋 개요

ToothFairy 프로젝트의 배포 가이드입니다. 현재 Static Adapter를 사용하여 CSR(Client-Side Rendering) 모드로 배포됩니다.

## 🏗️ 빌드 설정

### SvelteKit 설정

`svelte.config.js`에서 Static Adapter 설정:

```javascript
import adapter from '@sveltejs/adapter-static';

const config = {
	kit: {
		adapter: adapter({
			fallback: 'index.html' // CSR 모드용 fallback
		}),
		paths: {
			base: process.env.BASE_PATH || '' // GitHub Pages 경로 설정
		},
		prerender: {
			entries: [] // SSR 비활성화
		}
	}
};
```

## 🚀 배포 방법

### 1. 로컬 빌드

```bash
# 의존성 설치
pnpm install

# 프로덕션 빌드
pnpm build

# 빌드 결과 확인
pnpm preview
```

### 2. GitHub Pages 배포

#### 자동 배포 (GitHub Actions)

`.github/workflows/deploy.yml` 파일 생성:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Build
        run: pnpm build
        env:
          VITE_APP_ENV: prod

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./build
```

#### 수동 배포

```bash
# 빌드
pnpm build

# build 폴더의 내용을 GitHub Pages 브랜치에 푸시
```

### 3. Vercel 배포

#### Vercel CLI 사용

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

#### Vercel 대시보드

1. Vercel 대시보드에서 새 프로젝트 생성
2. GitHub 저장소 연결
3. 빌드 설정:
   - **Framework Preset**: SvelteKit
   - **Build Command**: `pnpm build`
   - **Output Directory**: `build`
   - **Install Command**: `pnpm install`

### 4. Netlify 배포

#### Netlify CLI 사용

```bash
# Netlify CLI 설치
npm install -g netlify-cli

# 배포
netlify deploy

# 프로덕션 배포
netlify deploy --prod
```

#### netlify.toml 설정

```toml
[build]
  command = "pnpm build"
  publish = "build"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## ⚙️ 환경 설정

### 환경 변수

프로덕션 환경에서 필요한 환경 변수:

```env
# 프로덕션 환경
VITE_APP_ENV=prod
VITE_BACKEND_URL=https://your-backend-domain.com
VITE_SOCKET_URL=wss://your-socket-domain.com
BASE_PATH=/toothfairy  # GitHub Pages 서브 경로인 경우
```

### 설정 파일

프로덕션용 설정 파일: `src/app/config/application.prod.json`

```json
{
	"server": {
		"backend": {
			"host": "your-backend-domain.com",
			"port": 443,
			"protocol": "https",
			"baseUrl": "https://your-backend-domain.com"
		},
		"socket": {
			"host": "your-socket-domain.com",
			"port": 443,
			"protocol": "wss",
			"baseUrl": "wss://your-socket-domain.com"
		}
	}
}
```

## 🔧 빌드 최적화

### 1. 번들 크기 최적화

```javascript
// vite.config.js
export default defineConfig({
	build: {
		rollupOptions: {
			output: {
				manualChunks: {
					vendor: ['svelte', 'axios'],
					ui: ['@tailwindcss/forms', '@tailwindcss/typography']
				}
			}
		}
	}
});
```

### 2. 이미지 최적화

```bash
# 이미지 압축
pnpm add -D imagemin imagemin-webp

# WebP 변환
npx imagemin static/**/*.{jpg,png} --out-dir=static/optimized
```

### 3. 코드 분할

```typescript
// 동적 임포트 사용
const LazyComponent = await import('./HeavyComponent.svelte');
```

## 📊 성능 모니터링

### Lighthouse 점수 확인

```bash
# Lighthouse CLI 설치
npm install -g lighthouse

# 성능 측정
lighthouse https://your-domain.com --output html --output-path ./lighthouse-report.html
```

### Web Vitals 모니터링

```typescript
// 성능 측정 코드 추가
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

## 🔒 보안 설정

### 1. HTTPS 강제

```javascript
// hooks.server.ts
export const handle = async ({ event, resolve }) => {
	// HTTPS 리다이렉트 (프로덕션에서만)
	if (process.env.NODE_ENV === 'production' && event.url.protocol === 'http:') {
		return new Response(null, {
			status: 301,
			headers: { Location: event.url.href.replace('http:', 'https:') }
		});
	}

	return resolve(event);
};
```

### 2. 보안 헤더

```javascript
// hooks.server.ts
export const handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	// 보안 헤더 추가
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-XSS-Protection', '1; mode=block');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

	return response;
};
```

## 🚨 문제 해결

### 1. 404 오류 (SPA 라우팅)

Static Adapter에서 SPA 라우팅을 위해 fallback 설정:

```javascript
// svelte.config.js
adapter: adapter({
	fallback: 'index.html'
});
```

### 2. 환경 변수 문제

```bash
# 환경 변수 확인
echo $VITE_APP_ENV

# 빌드 시 환경 변수 전달
VITE_APP_ENV=prod pnpm build
```

### 3. CORS 오류

백엔드에서 CORS 설정 확인:

```javascript
// 백엔드 CORS 설정
app.use(
	cors({
		origin: ['https://your-frontend-domain.com'],
		credentials: true
	})
);
```

### 4. 소켓 연결 오류

프로덕션에서 WSS 프로토콜 사용 확인:

```typescript
// CamSocketService.ts
const socketUrl = configService.getSocketUrl();
// wss://your-domain.com 형식이어야 함
```

## 📈 모니터링 및 로깅

### 1. 에러 추적

```typescript
// 에러 핸들러 추가
window.addEventListener('error', (event) => {
	console.error('Global error:', event.error);
	// 에러 추적 서비스로 전송
});

window.addEventListener('unhandledrejection', (event) => {
	console.error('Unhandled promise rejection:', event.reason);
});
```

### 2. 성능 로깅

```typescript
// 성능 측정
const observer = new PerformanceObserver((list) => {
	for (const entry of list.getEntries()) {
		console.log(`${entry.name}: ${entry.startTime}ms`);
	}
});

observer.observe({ entryTypes: ['navigation', 'resource'] });
```

## 📚 관련 문서

- [프로젝트 개요](./PROJECT_OVERVIEW.md)
- [개발 가이드](./DEVELOPMENT_GUIDE.md)
- [설정 관리](./CONFIG_MIGRATION_README.md)
- [SvelteKit 배포 문서](https://kit.svelte.dev/docs/adapters)
