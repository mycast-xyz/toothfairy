# ConfigService 사용 가이드

## 개선된 ConfigService의 장점

### 1. **유연한 설정 관리**

- JSON 파일에 새로운 설정을 추가할 때 TypeScript 인터페이스를 수정할 필요가 없음
- 동적 설정 접근으로 런타임에 설정 값 변경 가능
- 점 표기법을 사용한 직관적인 설정 접근

### 2. **자동 병합 기능**

- JSON 파일의 설정이 기본값과 자동으로 병합됨
- 누락된 설정은 기본값으로 자동 채워짐
- 환경별 설정 파일 간 일관성 보장

## 사용법

### 기본 사용법

```typescript
import { configService, getConfig, setConfig } from './ConfigService';

// 1. 점 표기법으로 설정 값 가져오기
const backendUrl = configService.get('server.backend.baseUrl');
const loginEndpoint = configService.get('api.endpoints.auth.login');

// 2. 편의 함수 사용
const backendUrl = getConfig('server.backend.baseUrl');

// 3. 설정 값 동적 변경
configService.set('app.debug', true);
setConfig('server.backend.port', 3001);
```

### API 엔드포인트 사용법

```typescript
// 기존 방식 (하드코딩)
const response = await api.get('/setting/users');

// 개선된 방식 (설정 기반)
const endpoint = configService.getApiEndpoint('setting', 'users');
const response = await api.get(endpoint);

// 중첩된 엔드포인트
const downloadEndpoint = configService.getNestedApiEndpoint('cam', 'data.download.single');
```

### 새로운 설정 추가 시

#### 1. JSON 파일에만 추가 (TypeScript 수정 불필요)

```json
{
	"api": {
		"endpoints": {
			"newFeature": {
				"list": "/api/v0/new-feature/list",
				"create": "/api/v0/new-feature/create",
				"update": "/api/v0/new-feature/update"
			}
		}
	},
	"newSection": {
		"setting1": "value1",
		"setting2": "value2",
		"nested": {
			"deep": "value"
		}
	}
}
```

#### 2. 코드에서 사용

```typescript
// 새로운 API 엔드포인트 사용
const listEndpoint = configService.getApiEndpoint('newFeature', 'list');
const createEndpoint = configService.getApiEndpoint('newFeature', 'create');

// 새로운 섹션의 설정 사용
const setting1 = configService.get('newSection.setting1');
const deepValue = configService.get('newSection.nested.deep');
```

### 설정 유효성 검사

```typescript
// 설정 유효성 검사
const validation = configService.validateConfig();
if (!validation.isValid) {
	console.error('설정 오류:', validation.errors);
}
```

### 환경별 설정

```typescript
// 현재 환경 확인
const env = configService.getEnvironment(); // 'dev', 'prod' 등

// 환경별 설정 가져오기
const isDebug = configService.isDebug();
const features = configService.get('app.features');
```

## 실제 사용 예시

### UserApiService에서의 사용

```typescript
class UserApiService {
	async getAllUsers(): Promise<ApiResponse<User[]>> {
		try {
			// 설정에서 엔드포인트 가져오기
			const endpoint = configService.getApiEndpoint('setting', 'users');
			const response = await this.api.get<ApiResponse<User[]>>(endpoint);
			return response.data;
		} catch (error) {
			console.error('❌ 사용자 목록 조회 오류:', error);
			throw error;
		}
	}

	async permitUser(id: string): Promise<ApiResponse<User>> {
		try {
			const baseEndpoint = configService.getApiEndpoint('setting', 'users');
			const response = await this.api.patch<ApiResponse<User>>(`${baseEndpoint}/${id}/permit`);
			return response.data;
		} catch (error) {
			console.error('❌ 사용자 승인 오류:', error);
			throw error;
		}
	}
}
```

### 동적 설정 변경

```typescript
// 런타임에 설정 변경
configService.set('app.debug', true);
configService.set('server.backend.port', 3001);

// 변경된 설정 확인
const newPort = configService.get('server.backend.port'); // 3001
```

## 장점 요약

1. **개발 편의성**: JSON 파일만 수정하면 됨
2. **타입 안전성**: 기본 타입은 유지하면서 유연성 확보
3. **동적 접근**: 점 표기법으로 직관적인 설정 접근
4. **자동 병합**: 기본값과 사용자 설정 자동 병합
5. **유효성 검사**: 설정 오류 사전 감지
6. **환경별 관리**: 개발/프로덕션 환경별 설정 분리

## 마이그레이션 가이드

### 기존 코드에서 새로운 방식으로 변경

```typescript
// 기존 방식
const backendUrl = configService.getBackendUrl();

// 새로운 방식 (동일한 결과)
const backendUrl = configService.get('server.backend.baseUrl');

// 기존 방식
const endpoint = configService.getApiEndpoint('auth', 'login');

// 새로운 방식 (동일한 결과)
const endpoint = configService.get('api.endpoints.auth.login');
```

이제 JSON 파일에 새로운 설정을 추가할 때마다 TypeScript 인터페이스를 수정할 필요가 없어졌습니다!
