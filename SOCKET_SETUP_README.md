# ToothFairy CAM Print 실시간 소켓 서버 설정

이 문서는 `G:\GitHub\toothfairy-socket-server`에서 `cam/print`에 대한 실시간 소켓 처리를 설정하는 방법을 설명합니다.

## 📋 목차

1. [개요](#개요)
2. [소켓 서버 설정](#소켓-서버-설정)
3. [프론트엔드 연동](#프론트엔드-연동)
4. [메시지 프로토콜](#메시지-프로토콜)
5. [실행 방법](#실행-방법)
6. [문제 해결](#문제-해결)

## 🎯 개요

ToothFairy CAM Print 시스템에서 실시간으로 출력물 상태를 모니터링하고 제어하기 위한 WebSocket 기반 실시간 통신 시스템입니다.

### 주요 기능

- ✅ 실시간 출력물 상태 모니터링
- ✅ 출력 작업 시작/중지 제어
- ✅ 진행률 실시간 업데이트
- ✅ 브라우저 알림 및 토스트 메시지
- ✅ 자동 재연결 기능
- ✅ 채널 기반 구독 시스템

## 🚀 소켓 서버 설정

### 1. 소켓 서버 폴더 생성

```bash
# G:\GitHub\toothfairy-socket-server 폴더로 이동
cd G:\GitHub\toothfairy-socket-server

# 프로젝트 초기화
npm init -y
```

### 2. 의존성 설치

```bash
npm install ws
npm install --save-dev nodemon
```

### 3. 서버 파일 생성

`G:\GitHub\toothfairy-socket-server\server.js` 파일을 생성하고 `socket-server-example.js`의 내용을 복사합니다.

### 4. package.json 수정

`package.json`을 다음과 같이 수정합니다:

```json
{
	"name": "toothfairy-socket-server",
	"version": "1.0.0",
	"main": "server.js",
	"scripts": {
		"start": "node server.js",
		"dev": "nodemon server.js"
	},
	"dependencies": {
		"ws": "^8.14.2"
	},
	"devDependencies": {
		"nodemon": "^3.0.2"
	}
}
```

## 🔗 프론트엔드 연동

### 1. SocketService 추가

프론트엔드 프로젝트에 `src/app/service/SocketService.ts` 파일이 이미 추가되었습니다.

### 2. cam/print 페이지 업데이트

`src/routes/cam/print/+page.svelte` 파일이 실시간 소켓 데이터와 연동되도록 업데이트되었습니다.

### 3. 환경 설정

소켓 서버 주소를 환경에 맞게 수정:

```typescript
// SocketService.ts에서
const socketUrl = 'ws://localhost:8080'; // 개발 환경
// const socketUrl = 'ws://your-production-server.com:8080'; // 프로덕션 환경
```

## 📡 메시지 프로토콜

### 클라이언트 → 서버

#### 구독 요청

```json
{
	"type": "subscribe",
	"channel": "cam/print",
	"data": {
		"action": "subscribe"
	}
}
```

#### 상태 요청

```json
{
	"type": "request",
	"channel": "cam/print",
	"data": {
		"action": "getStatus"
	}
}
```

#### 출력 작업 시작

```json
{
	"type": "command",
	"channel": "cam/print",
	"data": {
		"action": "startPrint",
		"fileId": "job-001",
		"priority": "normal"
	}
}
```

#### 출력 작업 중지

```json
{
	"type": "command",
	"channel": "cam/print",
	"data": {
		"action": "stopPrint",
		"jobId": "job-001"
	}
}
```

### 서버 → 클라이언트

#### 출력물 상태 업데이트

```json
{
	"type": "cam/print/status",
	"data": [
		{
			"id": "job-001",
			"fileName": "tooth_model_001.stl",
			"status": "printing",
			"progress": 45,
			"startTime": "2024-01-01T10:00:00.000Z",
			"estimatedTime": "2024-01-01T10:10:00.000Z",
			"priority": "normal"
		}
	]
}
```

#### 진행률 업데이트

```json
{
	"type": "cam/print/progress",
	"data": {
		"today": { "percent": 32.5, "remaining": 650, "total": 2000 },
		"urgent": { "percent": 15.2, "remaining": 320, "total": 2100 },
		"yesterday": { "percent": 32.5, "remaining": 650, "total": 2000 },
		"monthly": { "percent": 32.5, "remaining": 650, "total": 2000 },
		"totalAmount": 2000,
		"remainingAmount": 650
	}
}
```

#### 알림

```json
{
	"type": "cam/print/notification",
	"data": {
		"type": "success",
		"message": "출력 작업이 완료되었습니다: tooth_model_001.stl"
	}
}
```

## ▶️ 실행 방법

### 1. 소켓 서버 실행

```bash
# G:\GitHub\toothfairy-socket-server 폴더에서
npm start

# 또는 개발 모드 (자동 재시작)
npm run dev
```

### 2. 프론트엔드 실행

```bash
# toothfairy 프로젝트 폴더에서
npm run dev
```

### 3. 브라우저에서 확인

1. `http://localhost:5173/cam/print` 접속
2. 실시간 연결 상태 확인
3. 출력물 목록 및 진행률 실시간 업데이트 확인

## 🔧 문제 해결

### 소켓 연결 실패

1. **포트 확인**: 소켓 서버가 8080 포트에서 실행 중인지 확인
2. **방화벽 설정**: Windows 방화벽에서 8080 포트 허용
3. **서버 상태**: 터미널에서 서버 로그 확인

### 실시간 데이터가 업데이트되지 않음

1. **브라우저 콘솔**: 개발자 도구에서 에러 메시지 확인
2. **소켓 연결 상태**: 페이지 상단의 연결 상태 표시 확인
3. **서버 로그**: 소켓 서버 터미널에서 메시지 수신 확인

### 알림이 표시되지 않음

1. **브라우저 알림 권한**: 브라우저에서 알림 권한 허용
2. **토스트 서비스**: ToastService가 정상적으로 로드되었는지 확인

## 📝 추가 설정

### 프로덕션 환경

1. **환경 변수 설정**:

```bash
export NODE_ENV=production
export PORT=8080
```

2. **PM2로 프로세스 관리**:

```bash
npm install -g pm2
pm2 start server.js --name "toothfairy-socket"
pm2 save
pm2 startup
```

### 데이터베이스 연동

실제 운영 환경에서는 메모리 데이터 대신 데이터베이스를 사용하세요:

```javascript
// 예시: MongoDB 연동
const mongoose = require('mongoose');
const PrintJob = require('./models/PrintJob');

// 데이터베이스에서 출력 작업 조회
async function getPrintJobs() {
	return await PrintJob.find().sort({ createdAt: -1 });
}
```

### 보안 설정

1. **인증 추가**:

```javascript
// JWT 토큰 검증
const jwt = require('jsonwebtoken');

function authenticateToken(token) {
	try {
		return jwt.verify(token, process.env.JWT_SECRET);
	} catch (error) {
		return null;
	}
}
```

2. **CORS 설정**:

```javascript
const cors = require('cors');
app.use(
	cors({
		origin: ['http://localhost:5173', 'https://your-domain.com']
	})
);
```

## 📞 지원

문제가 발생하거나 추가 기능이 필요한 경우:

1. 이슈 트래커에 등록
2. 개발팀에 문의
3. 기술 문서 참조

---

**참고**: 이 설정은 개발 환경을 기준으로 작성되었습니다. 프로덕션 환경에서는 보안, 성능, 안정성을 고려한 추가 설정이 필요합니다.
