# ToothFairy 설정 중앙화 완료

이 문서는 ToothFairy 프로젝트에서 하드코딩된 설정 값들을 `app/config/application.dev.json` 형태로 중앙화한 작업에 대한 설명입니다.

## 🎯 완료된 작업

### 1. 설정 파일 구조 생성

#### 프론트엔드 설정 파일

- `src/app/config/application.dev.json` - 개발 환경 설정
- `src/app/config/application.prod.json` - 프로덕션 환경 설정

#### 소켓 서버 설정 파일

- `socket-server-config.dev.json` - 소켓 서버 개발 환경 설정

### 2. ConfigService 생성

- `src/app/service/ConfigService.ts` - 설정 로드 및 관리 서비스
- `src/utils/ConfigUtils.ts` - 설정 관련 유틸리티 함수들

### 3. 기존 코드 수정

#### 수정된 파일들:

- ✅ `src/app/service/SocketService.ts` - 소켓 URL 및 설정 중앙화
- ✅ `src/app/service/WindowService.ts` - 백엔드 URL 중앙화
- ✅ `socket-server-example.js` - 소켓 서버 설정 중앙화
- ✅ `src/hooks.server.ts` - 백엔드 API URL 주석 업데이트
- ✅ `src/routes/login/+page.server.ts` - 백엔드 API URL 주석 업데이트

## 📁 설정 파일 구조

### application.dev.json

```json
{
  "server": {
    "backend": { "host": "localhost", "port": 3000, "protocol": "http" },
    "socket": { "host": "localhost", "port": 8080, "protocol": "ws" },
    "frontend": { "host": "localhost", "port": 5173, "protocol": "http" }
  },
  "api": {
    "endpoints": {
      "auth": { "login": "/api/v0/account/login", ... },
      "company": { "list": "/api/v0/corp/list", ... },
      "file": { "check": "/api/v0/file/chk", ... },
      "invoice": { "list": "/api/v0/invoice/list", ... }
    }
  },
  "socket": {
    "channels": { "camPrint": "cam/print" },
    "reconnect": { "maxAttempts": 5, "interval": 3000 },
    "timeout": { "connection": 10000, "message": 5000 }
  },
  "app": {
    "name": "ToothFairy",
    "version": "1.0.0",
    "environment": "development",
    "debug": true,
    "features": { "socket": true, "notifications": true, "mobile": true }
  },
  "security": { "jwt": { ... }, "cors": { ... } },
  "database": { "type": "sqlite", ... },
  "logging": { "level": "debug", ... }
}
```

### socket-server-config.dev.json

```json
{
  "server": { "port": 8080, "host": "localhost", "protocol": "ws" },
  "channels": { "camPrint": "cam/print" },
  "clients": { "maxConnections": 100, "timeout": { ... } },
  "reconnect": { "maxAttempts": 5, "interval": 3000 },
  "logging": { "level": "debug", "console": true },
  "security": { "cors": { ... } },
  "data": { "simulation": { "enabled": true, "interval": 2000 } }
}
```

## 🔧 사용 방법

### 1. ConfigService 사용

```typescript
import { configService, getBackendUrl, getSocketUrl } from '../app/service/ConfigService';

// 백엔드 URL 가져오기
const backendUrl = getBackendUrl();

// 소켓 URL 가져오기
const socketUrl = getSocketUrl();

// API 엔드포인트 가져오기
const loginEndpoint = configService.getApiEndpoint('auth', 'login');

// 설정 확인
const isDebug = configService.isDebug();
const isFeatureEnabled = configService.isFeatureEnabled('socket');
```

### 2. ConfigUtils 사용

```typescript
import { getCurrentBackendUrl, buildApiUrl } from '../utils/ConfigUtils';

// 현재 환경에 맞는 백엔드 URL
const backendUrl = getCurrentBackendUrl(hostname);

// API URL 생성
const apiUrl = buildApiUrl('/api/v0/corp/list', hostname);

// 환경 확인
const isDev = isDevelopment();
const isDebug = isDebugMode();
```

### 3. 환경별 설정 전환

```bash
# 개발 환경
export VITE_APP_ENV=dev

# 프로덕션 환경
export VITE_APP_ENV=prod
```

## 🚀 장점

### 1. 중앙화된 설정 관리

- ✅ 모든 설정이 한 곳에서 관리됨
- ✅ 환경별 설정 분리 (dev/prod)
- ✅ 설정 변경 시 한 곳만 수정하면 됨

### 2. 타입 안전성

- ✅ TypeScript 인터페이스로 설정 타입 정의
- ✅ 컴파일 타임에 설정 오류 감지

### 3. 유연성

- ✅ 런타임에 설정 로드
- ✅ 설정 파일이 없어도 기본값 사용
- ✅ 환경 변수로 설정 오버라이드 가능

### 4. 확장성

- ✅ 새로운 설정 추가 용이
- ✅ 새로운 환경 추가 용이
- ✅ 설정 검증 로직 추가 가능

## 📝 남은 작업

### 1. 페이지 파일들 업데이트

다음 파일들에서 하드코딩된 URL을 ConfigUtils를 사용하도록 수정 필요:

- `src/routes/+page.ts`
- `src/routes/+layout.ts`
- `src/routes/login/+page.ts`
- `src/routes/login/create/+page.ts`
- `src/routes/lab/request/+page.ts`
- `src/routes/center/company/+page.ts`
- `src/routes/center/print/+page.ts`
- `src/routes/center/invoice/+page.ts`
- `src/routes/center/invoice/[slug]/+page.ts`
- `src/routes/center/show/[slug]/+page.ts`

### 2. 환경 변수 설정

- `.env` 파일 생성
- 환경별 설정 파일 자동 로드

### 3. 설정 검증

- 설정 파일 유효성 검사
- 필수 설정 누락 시 경고

## 🔄 마이그레이션 가이드

### 기존 코드를 새로운 방식으로 변경

#### Before:

```typescript
const currentUrl = 'http://' + url.hostname + ':3000';
const socketUrl = 'ws://localhost:8080';
```

#### After:

```typescript
import { getCurrentBackendUrl, getCurrentSocketUrl } from '../utils/ConfigUtils';

const currentUrl = getCurrentBackendUrl(url.hostname);
const socketUrl = getCurrentSocketUrl();
```

### API 호출 변경

#### Before:

```typescript
await axios.get(currentUrl + '/api/v0/corp/list');
```

#### After:

```typescript
import { buildApiUrl } from '../utils/ConfigUtils';

await axios.get(buildApiUrl('/api/v0/corp/list', url.hostname));
```

## 📞 지원

설정 중앙화 관련 문의사항이 있으시면:

1. 이 문서 참조
2. ConfigService 코드 리뷰
3. 개발팀에 문의

---

**참고**: 이 작업은 기존 기능에 영향을 주지 않으면서 점진적으로 적용할 수 있도록 설계되었습니다. 모든 설정은 기본값을 제공하므로 설정 파일이 없어도 정상 동작합니다.
