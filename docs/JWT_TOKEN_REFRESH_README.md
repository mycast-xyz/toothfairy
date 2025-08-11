# JWT 토큰 자동 갱신 시스템

## 개요

ToothFairy 애플리케이션은 사용자가 페이지에 오래 머물면서 JWT 토큰의 유효기간이 줄어드는 문제를 해결하기 위해 자동 토큰 갱신 시스템을 구현했습니다.

## 주요 기능

### 1. 자동 토큰 갱신 (Silent Refresh)

- **백그라운드 갱신**: 사용자가 페이지를 사용하지 않을 때도 자동으로 토큰을 갱신
- **사전 갱신**: 토큰 만료 10분 전에 미리 갱신하여 만료로 인한 서비스 중단 방지
- **무음 갱신**: 사용자에게 알리지 않고 백그라운드에서 처리

### 2. 사용자 활동 기반 갱신

- **활동 감지**: 마우스, 키보드, 터치, 스크롤 등의 사용자 활동을 실시간으로 감지
- **비활동 처리**: 5분 동안 활동이 없으면 토큰 상태를 확인하고 필요시 갱신
- **스마트 갱신**: 사용자 활동 패턴을 분석하여 최적의 시점에 토큰 갱신

### 3. 설정 기반 동작

- **환경별 설정**: 개발/프로덕션 환경에 따라 다른 갱신 정책 적용
- **동적 조정**: 런타임에 갱신 임계값과 타임아웃을 조정 가능
- **기능 토글**: 각 갱신 기능을 개별적으로 활성화/비활성화 가능

## 아키텍처

### 핵심 서비스

#### 1. AuthTokenService

```typescript
// 토큰 상태 관리 및 자동 갱신 스케줄링
class AuthTokenService {
	private scheduleTokenRefresh(token: string): void;
	private async refreshTokenSilently(): Promise<void>;
	public isTokenExpiringSoon(threshold: number): boolean;
}
```

#### 2. TokenRefreshService

```typescript
// 백그라운드 토큰 갱신 처리
class TokenRefreshService {
	private startBackgroundRefresh(): void;
	private async checkAndRefreshToken(): Promise<void>;
	public async forceRefresh(): Promise<boolean>;
}
```

#### 3. UserActivityService

```typescript
// 사용자 활동 추적 및 활동 기반 갱신
class UserActivityService {
	private initializeActivityTracking(): void;
	private async handleInactivity(): Promise<void>;
	public getCurrentActivityStatus(): ActivityStatus;
}
```

### 설정 구조

```json
{
	"security": {
		"jwt": {
			"autoRefresh": {
				"enabled": true,
				"threshold": 600000, // 10분 전에 갱신
				"backgroundCheck": true, // 백그라운드 체크 활성화
				"activityBased": true, // 활동 기반 갱신 활성화
				"activityTimeout": 300000 // 5분 동안 활동이 없으면 체크
			}
		}
	}
}
```

## 사용 방법

### 1. 자동 초기화

메인 레이아웃에서 자동으로 초기화됩니다:

```svelte
<!-- src/routes/+layout.svelte -->
<script>
	import { tokenRefreshService } from '../app/service/auth/TokenRefreshService';
	import { userActivityService } from '../app/service/auth/UserActivityService';

	onMount(() => {
		// 서비스 자동 시작
		console.log('🚀 토큰 갱신 서비스 초기화');
	});
</script>
```

### 2. 수동 토큰 갱신

필요시 수동으로 토큰을 갱신할 수 있습니다:

```typescript
import { authTokenService } from '../app/service/auth/AuthTokenService';

// 수동 갱신
const success = await authTokenService.refreshToken();
if (success) {
	console.log('토큰 갱신 성공');
}
```

### 3. 강제 갱신

긴급 상황에서 강제로 토큰을 갱신할 수 있습니다:

```typescript
import { tokenRefreshService } from '../app/service/auth/TokenRefreshService';

// 강제 갱신
const success = await tokenRefreshService.forceRefresh();
```

## 모니터링 및 디버깅

### 개발 모드에서 토큰 상태 표시

개발 환경에서는 화면 우하단에 토큰 상태가 실시간으로 표시됩니다:

```
토큰 만료: 2024-01-15 오후 2:30:00
남은 시간: 45분 30초
사용자 상태: 활성
```

### 콘솔 로그

자세한 동작 상태는 브라우저 콘솔에서 확인할 수 있습니다:

```
🚀 토큰 갱신 서비스 초기화
🔄 백그라운드 토큰 갱신 서비스 시작
🕐 토큰 갱신 스케줄링: 2700초 후
🔄 자동 토큰 갱신 시작...
✅ 자동 토큰 갱신 성공
```

## 성능 최적화

### 1. 메모리 관리

- 타이머와 인터벌을 적절히 정리하여 메모리 누수 방지
- 컴포넌트 언마운트 시 모든 리소스 정리

### 2. 네트워크 최적화

- 중복 갱신 요청 방지
- 갱신 실패 시 지수 백오프 적용

### 3. 사용자 경험

- 갱신 중에도 서비스 중단 없음
- 백그라운드에서 처리하여 사용자 작업 방해 최소화

## 보안 고려사항

### 1. 토큰 보안

- httpOnly 쿠키 사용으로 XSS 공격 방지
- Secure 플래그로 HTTPS 환경에서만 전송
- SameSite 설정으로 CSRF 공격 방지

### 2. 갱신 정책

- 적절한 갱신 임계값 설정으로 토큰 만료 위험 최소화
- 갱신 실패 시 즉시 로그아웃 처리
- 사용자 활동 기반 갱신으로 불필요한 갱신 요청 최소화

## 문제 해결

### 일반적인 문제

#### 1. 토큰 갱신이 작동하지 않는 경우

- 설정 파일에서 `autoRefresh.enabled` 확인
- 브라우저 콘솔에서 오류 메시지 확인
- 네트워크 탭에서 API 요청 상태 확인

#### 2. 너무 자주 갱신되는 경우

- `threshold` 값을 늘려서 갱신 빈도 조정
- `activityTimeout` 값을 조정하여 활동 감지 민감도 조절

#### 3. 갱신 실패 시 로그아웃되는 경우

- 백엔드 refresh API 엔드포인트 확인
- refresh 토큰의 유효성 및 만료 시간 확인

### 로그 분석

```bash
# 토큰 갱신 관련 로그 필터링
grep -E "(토큰|갱신|refresh)" logs/app.log

# 사용자 활동 관련 로그 필터링
grep -E "(활동|activity|inactivity)" logs/app.log
```

## 향후 개선 계획

### 1. 고급 기능

- 머신러닝을 활용한 사용자 활동 패턴 분석
- 적응형 갱신 임계값 조정
- 다중 디바이스 동기화

### 2. 모니터링 강화

- 토큰 갱신 성공률 통계
- 사용자 활동 패턴 분석 대시보드
- 실시간 알림 시스템

### 3. 성능 최적화

- Web Workers를 활용한 백그라운드 처리
- Service Worker를 활용한 오프라인 지원
- 캐싱 전략 개선

## 결론

JWT 토큰 자동 갱신 시스템은 사용자 경험을 크게 향상시키고, 보안을 강화하며, 시스템 안정성을 높이는 핵심 기능입니다. 이 시스템을 통해 사용자는 토큰 만료로 인한 불편함 없이 애플리케이션을 사용할 수 있으며, 개발자는 토큰 관리에 대한 부담을 줄일 수 있습니다.
