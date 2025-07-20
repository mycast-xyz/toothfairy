# API 문서

## 📋 개요

ToothFairy 프로젝트의 백엔드 API 엔드포인트 문서입니다.

## 🔗 기본 URL

### 개발 환경

```
http://localhost:3000
```

### 프로덕션 환경

```
http://localhost:3000
```

## 🔐 인증 API

### 로그인

```http
POST /api/v0/account/login
```

**요청 본문:**

```json
{
	"username": "string",
	"password": "string"
}
```

**응답:**

```json
{
	"resultCode": 200,
	"accessToken": "string",
	"refreshToken": "string"
}
```

### 로그아웃

```http
POST /api/v0/account/logout
```

### 토큰 갱신

```http
POST /api/v0/account/refresh
```

## 🏢 거래처 관리 API

### 거래처 목록 조회

```http
GET /api/v0/corp/list
```

### 거래처 추가

```http
POST /api/v0/corp/add
```

### 거래처 수정

```http
POST /api/v0/corp/update
```

### 거래처 삭제

```http
POST /api/v0/corp/delete
```

## 📁 파일 관리 API

### 파일 확인

```http
GET /api/v0/center/file/chk
```

### 파일 조회

```http
GET /api/v0/center/file/show
```

### 파일 상세 정보

```http
GET /api/v0/center/file/item?id={id}
```

## 📄 청구서 관리 API

### 청구서 목록

```http
GET /api/v0/center/invoice/list
```

### 거래처별 청구서

```http
GET /api/v0/center/invoice/corp
```

## 🖨️ CAM 데이터 API

### 영수증 데이터

```http
GET /api/v0/cam/data/receipts
```

### 단일 파일 다운로드

```http
GET /api/v0/cam/data/download/single
```

### 다중 파일 다운로드

```http
GET /api/v0/cam/data/download/multi
```

### 완료 처리

```http
POST /api/v0/cam/data/complete
```

### 진행 상황

```http
GET /api/v0/cam/data/progress
```

## ⚙️ 설정 관리 API

### 사용자 목록

```http
GET /api/v0/setting/users
```

### 사용자 정보

```http
GET /api/v0/setting/user
```

### 사용자 역할

```http
GET /api/v0/setting/roles
```

### 사이트 설정

```http
GET /api/v0/setting/site
```

## 🔌 소켓 이벤트

### CAM 출력 채널

- **채널명**: `cam/print`
- **연결 URL**: `ws://localhost:30090`

### 이벤트 타입

- `print_progress`: 출력 진행 상황
- `print_complete`: 출력 완료
- `print_error`: 출력 오류

## 📊 응답 형식

### 성공 응답

```json
{
	"resultCode": 200,
	"message": "성공",
	"data": {}
}
```

### 오류 응답

```json
{
	"resultCode": 400,
	"message": "오류 메시지",
	"error": "상세 오류 정보"
}
```

## 🔒 인증 헤더

API 요청 시 JWT 토큰을 Authorization 헤더에 포함해야 합니다:

```http
Authorization: Bearer {accessToken}
```

## 📝 사용 예시

### Axios를 사용한 API 호출

```typescript
import axios from 'axios';
import { configService } from '../app/service/ConfigService';

// 백엔드 URL 가져오기
const backendUrl = configService.getBackendUrl();

// API 엔드포인트 가져오기
const endpoint = configService.getApiEndpoint('company', 'list');

// API 호출
const response = await axios.get(`${backendUrl}${endpoint}`, {
	headers: {
		Authorization: `Bearer ${token}`
	}
});
```

## 🚨 오류 처리

### 일반적인 HTTP 상태 코드

- `200`: 성공
- `400`: 잘못된 요청
- `401`: 인증 실패
- `403`: 권한 없음
- `404`: 리소스 없음
- `500`: 서버 오류

### 토큰 만료 처리

```typescript
// 토큰 만료 시 자동 갱신
if (response.status === 401) {
	const newToken = await refreshToken();
	// 재시도 로직
}
```

## 📚 관련 문서

- [설정 관리](./CONFIG_MIGRATION_README.md)
- [소켓 설정](./SOCKET_SETUP_README.md)
- [CAM 소켓 IO](./CAM_SOCKET_IO_README.md)
