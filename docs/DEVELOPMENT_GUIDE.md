# 개발 가이드

## 📋 시작하기

### 필수 요구사항

- Node.js 18+
- pnpm 8+
- Git

### 프로젝트 설정

```bash
# 저장소 클론
git clone [repository-url]
cd toothfairy

# 의존성 설치
pnpm install

# 개발 서버 시작
pnpm dev
```

## 🏗️ 프로젝트 구조

### 핵심 디렉토리

```
src/
├── app/                    # 애플리케이션 코어
│   ├── config/            # 설정 파일 (dev/prod)
│   ├── model/             # 데이터 모델 및 타입
│   ├── service/           # 비즈니스 로직
│   └── view/              # UI 컴포넌트
├── routes/                # SvelteKit 라우트
└── utils/                 # 유틸리티 함수
```

### 파일 명명 규칙

- **컴포넌트**: PascalCase (예: `HeaderMenu.svelte`)
- **서비스**: PascalCase (예: `ConfigService.ts`)
- **유틸리티**: camelCase (예: `MobileUtils.ts`)
- **라우트**: kebab-case (예: `+page.svelte`)

## 🔧 개발 환경 설정

### 환경 변수

`.env` 파일 생성:

```env
VITE_APP_ENV=dev
VITE_BACKEND_URL=http://localhost:3000
VITE_SOCKET_URL=ws://localhost:30090
```

### 설정 파일

- `src/app/config/application.dev.json`: 개발 환경 설정
- `src/app/config/application.prod.json`: 프로덕션 환경 설정

## 📝 코딩 스타일

### TypeScript

```typescript
// 타입 정의
interface User {
	id: string;
	name: string;
	role: UserRole;
}

// 함수 정의
function getUserById(id: string): Promise<User> {
	// 구현
}
```

### Svelte 컴포넌트

```svelte
<script lang="ts">
	// Props 정의
	const { data } = $props<{ data: any }>();

	// 상태 관리
	let isLoading = $state(false);

	// 반응형 값
	let displayName = $derived(data?.user?.name || 'Unknown');
</script>

<template>
	<div class="container">
		<h1>{displayName}</h1>
	</div>
</template>

<style lang="scss">
	.container {
		@apply rounded-lg bg-white p-4;
	}
</style>
```

### CSS/Tailwind

```scss
// Tailwind 클래스 우선 사용
.container {
	@apply flex items-center justify-between p-4;
}

// 커스텀 스타일이 필요한 경우만 SCSS 사용
.custom-button {
	@apply bg-blue-500 hover:bg-blue-600;

	&:disabled {
		@apply cursor-not-allowed bg-gray-300;
	}
}
```

## 🔐 인증 및 권한

### 사용자 역할

```typescript
type UserRole = 'all_admin' | 'all_lab' | 'all_center' | 'all_cam' | 'user';
```

### 권한 확인

```typescript
import { PermissionService } from '../app/service/auth/PermissionService';

// 페이지 접근 권한 확인
const canAccess = PermissionService.canAccessPage(userRole, '/admin');
```

## 🌐 API 통신

### ConfigService 사용

```typescript
import { configService } from '../app/service/ConfigService';

// 백엔드 URL 가져오기
const backendUrl = configService.getBackendUrl();

// API 엔드포인트 가져오기
const endpoint = configService.getApiEndpoint('company', 'list');
```

### Axios 인터셉터

```typescript
// 요청 인터셉터
axios.interceptors.request.use((config) => {
	const token = authTokenService.getToken();
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

// 응답 인터셉터
axios.interceptors.response.use(
	(response) => response,
	async (error) => {
		if (error.response?.status === 401) {
			// 토큰 갱신 로직
		}
		return Promise.reject(error);
	}
);
```

## 📱 반응형 디자인

### 모바일 감지

```typescript
import { MobileUtils } from '../utils/mobile/MobileUtils';

const isMobile = MobileUtils.isMobile();
```

### 조건부 렌더링

```svelte
{#if data.isMobile}
	<MobileComponent />
{:else}
	<DesktopComponent />
{/if}
```

## 🔌 소켓 통신

### CamSocketService 사용

```typescript
import { CamSocketService } from '../app/service/CamSocketService';

// 소켓 연결
CamSocketService.connect();

// 이벤트 리스너
CamSocketService.onPrintProgress((data) => {
	console.log('출력 진행:', data);
});
```

## 🧪 테스트

### 단위 테스트

```bash
# 테스트 실행
pnpm test

# 테스트 감시 모드
pnpm test:unit
```

### 테스트 예시

```typescript
import { describe, it, expect } from 'vitest';
import { PermissionService } from './PermissionService';

describe('PermissionService', () => {
	it('should allow admin access to all pages', () => {
		const canAccess = PermissionService.canAccessPage('all_admin', '/admin');
		expect(canAccess).toBe(true);
	});
});
```

## 🔍 디버깅

### 개발자 도구

```typescript
// 디버그 로그
console.log('🔍 Debug:', data);

// 경고 메시지
console.warn('⚠️ Warning:', message);

// 오류 로그
console.error('❌ Error:', error);
```

### 브라우저 개발자 도구

- **Network**: API 요청/응답 확인
- **Console**: 로그 및 오류 확인
- **Elements**: DOM 구조 확인
- **Application**: 쿠키, 로컬 스토리지 확인

## 📦 빌드 및 배포

### 개발 빌드

```bash
# 개발 서버
pnpm dev

# 타입 체크
pnpm check

# 린트 검사
pnpm lint
```

### 프로덕션 빌드

```bash
# 빌드
pnpm build

# 미리보기
pnpm preview
```

## 🚨 일반적인 문제 해결

### 1. 타입 오류

```bash
# 타입 체크 실행
pnpm check

# 타입 정의 업데이트
pnpm run svelte-kit sync
```

### 2. 스타일 문제

```bash
# Tailwind CSS 재빌드
pnpm run build:css
```

### 3. 의존성 문제

```bash
# node_modules 삭제 후 재설치
rm -rf node_modules
pnpm install
```

### 4. 캐시 문제

```bash
# SvelteKit 캐시 삭제
rm -rf .svelte-kit
pnpm dev
```

## 📚 추가 리소스

- [SvelteKit 공식 문서](https://kit.svelte.dev/)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [TypeScript 핸드북](https://www.typescriptlang.org/docs/)
- [프로젝트 개요](./PROJECT_OVERVIEW.md)
- [API 문서](./API_DOCUMENTATION.md)
