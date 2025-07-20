# CAM Socket.IO 서버

CAM 출력물 실시간 상태 및 진행률 관리를 위한 Socket.IO 기반 서버입니다.

## 개요

이 서버는 CAM 출력물의 실시간 상태 모니터링, 진행률 추적, 알림 기능을 제공합니다. Socket.IO를 사용하여 안정적이고 확장 가능한 실시간 통신을 구현했습니다.

## 주요 기능

- **실시간 상태 모니터링**: 출력물 작업의 실시간 상태 업데이트
- **진행률 추적**: 출력 진행률의 실시간 추적
- **알림 시스템**: 출력 시작/완료/오류 알림
- **자동 재연결**: 네트워크 오류 시 자동 재연결
- **채널 기반 구독**: cam/print 채널을 통한 메시지 라우팅
- **설정 기반 관리**: JSON 설정 파일을 통한 서버 설정 관리

## 기술 스택

- **Node.js**: 서버 런타임
- **Socket.IO**: 실시간 양방향 통신
- **HTTP Server**: 기본 HTTP 서버
- **JSON Config**: 설정 파일 관리

## 설치 및 실행

### 1. 의존성 설치

```bash
# Socket.IO 서버 디렉토리로 이동
cd socket-server-directory

# 의존성 설치
npm install
```

### 2. 설정 파일 확인

`socket-server-config.dev.json` 파일을 확인하고 필요에 따라 수정:

```json
{
	"server": {
		"port": 30090,
		"host": "localhost",
		"protocol": "ws"
	},
	"channels": {
		"camPrint": "cam/print"
	},
	"clients": {
		"maxConnections": 100
	},
	"reconnect": {
		"maxAttempts": 5,
		"interval": 3000
	},
	"logging": {
		"level": "debug",
		"console": true
	},
	"data": {
		"simulation": {
			"enabled": true,
			"interval": 2000
		}
	}
}
```

### 3. 서버 실행

```bash
# 개발 모드 (nodemon 사용)
npm run dev

# 프로덕션 모드
npm start

# 직접 실행
node cam-socket-server-example.js
```

## 클라이언트 연결

### Socket.IO 클라이언트 설정

프론트엔드에서 Socket.IO 클라이언트를 사용하여 연결:

```javascript
import { io } from 'socket.io-client';

const socket = io('ws://localhost:8080', {
	transports: ['websocket', 'polling'],
	reconnection: true,
	reconnectionAttempts: 5,
	reconnectionDelay: 3000,
	timeout: 20000
});
```

### 이벤트 구독

```javascript
// 연결 성공
socket.on('connect', () => {
	console.log('CAM Socket.IO 서버에 연결되었습니다.');

	// cam/print 채널 구독
	socket.emit('subscribe', {
		channel: 'cam/print',
		data: { action: 'subscribe' }
	});
});

// 출력물 상태 업데이트
socket.on('cam/print/status', (data) => {
	console.log('출력물 상태:', data);
});

// 진행률 업데이트
socket.on('cam/print/progress', (data) => {
	console.log('진행률:', data);
});

// 알림
socket.on('cam/print/notification', (data) => {
	console.log('알림:', data);
});
```

## API 참조

### 서버 이벤트

#### 클라이언트 → 서버

| 이벤트      | 데이터                                               | 설명           |
| ----------- | ---------------------------------------------------- | -------------- |
| `subscribe` | `{ channel: string, data: object }`                  | 채널 구독 요청 |
| `request`   | `{ channel: string, data: { action: string } }`      | 데이터 요청    |
| `command`   | `{ channel: string, data: { action: string, ... } }` | 명령 실행      |

#### 서버 → 클라이언트

| 이벤트                   | 데이터                              | 설명             |
| ------------------------ | ----------------------------------- | ---------------- |
| `cam/print/status`       | `PrintJob[]`                        | 출력물 상태 배열 |
| `cam/print/progress`     | `ProgressData`                      | 진행률 데이터    |
| `cam/print/notification` | `Notification`                      | 알림 메시지      |
| `message`                | `{ type: string, message: string }` | 일반 메시지      |
| `error`                  | `{ message: string }`               | 오류 메시지      |

### 데이터 구조

#### PrintJob

```typescript
interface PrintJob {
	id: string;
	fileName: string;
	status: 'waiting' | 'printing' | 'completed' | 'error' | 'paused';
	progress: number; // 0-100
	startTime: Date | null;
	estimatedTime: Date | null;
	priority: 'low' | 'normal' | 'high' | 'urgent';
}
```

#### ProgressData

```typescript
interface ProgressData {
	today: { percent: number; remaining: number; total: number };
	urgent: { percent: number; remaining: number; total: number };
	yesterday: { percent: number; remaining: number; total: number };
	monthly: { percent: number; remaining: number; total: number };
	totalAmount: number;
	remainingAmount: number;
}
```

#### Notification

```typescript
interface Notification {
	type: 'info' | 'success' | 'warning' | 'error';
	message: string;
}
```

## 명령어 참조

### 출력물 상태 요청

```javascript
socket.emit('request', {
	channel: 'cam/print',
	data: { action: 'getStatus' }
});
```

### 진행률 요청

```javascript
socket.emit('request', {
	channel: 'cam/print',
	data: { action: 'getProgress' }
});
```

### 출력 작업 시작

```javascript
socket.emit('command', {
	channel: 'cam/print',
	data: {
		action: 'startPrint',
		fileId: 'job-001',
		priority: 'normal'
	}
});
```

### 출력 작업 중지

```javascript
socket.emit('command', {
	channel: 'cam/print',
	data: {
		action: 'stopPrint',
		jobId: 'job-001'
	}
});
```

## 설정 옵션

### 서버 설정

- `port`: 서버 포트 (기본값: 8080)
- `host`: 서버 호스트 (기본값: localhost)
- `protocol`: 프로토콜 (기본값: ws)

### 클라이언트 설정

- `maxConnections`: 최대 연결 수 (기본값: 100)

### 재연결 설정

- `maxAttempts`: 최대 재연결 시도 횟수 (기본값: 5)
- `interval`: 재연결 간격 (밀리초, 기본값: 3000)

### 로깅 설정

- `level`: 로그 레벨 (기본값: debug)
- `console`: 콘솔 출력 여부 (기본값: true)

### 데이터 시뮬레이션

- `enabled`: 시뮬레이션 활성화 여부 (기본값: true)
- `interval`: 시뮬레이션 간격 (밀리초, 기본값: 2000)

## 개발 가이드

### 새로운 이벤트 추가

1. 서버에서 이벤트 핸들러 추가:

```javascript
socket.on('newEvent', (data) => {
	// 이벤트 처리 로직
	handleNewEvent(socket, data);
});
```

2. 클라이언트에서 이벤트 구독:

```javascript
socket.on('newEvent', (data) => {
	console.log('새 이벤트:', data);
});
```

### 새로운 채널 추가

1. 설정 파일에 채널 추가:

```json
{
	"channels": {
		"camPrint": "cam/print",
		"newChannel": "new/channel"
	}
}
```

2. 서버에서 채널 처리 로직 추가:

```javascript
function handleSubscribe(socket, data) {
	const camPrintChannel = config.channels.camPrint;
	const newChannel = config.channels.newChannel;

	if (data.channel === camPrintChannel) {
		// cam/print 채널 처리
	} else if (data.channel === newChannel) {
		// 새 채널 처리
	}
}
```

## 모니터링 및 로깅

### 연결 상태 모니터링

서버는 30초마다 연결된 클라이언트 수와 구독자 수를 로깅합니다.

### 로그 레벨

- `debug`: 상세한 디버그 정보
- `info`: 일반 정보
- `warn`: 경고 메시지
- `error`: 오류 메시지

## 배포

### 프로덕션 환경

1. 환경 변수 설정:

```bash
export NODE_ENV=production
export PORT=8080
export HOST=0.0.0.0
```

2. PM2를 사용한 프로세스 관리:

```bash
npm install -g pm2
pm2 start cam-socket-server-example.js --name "cam-socket-server"
pm2 save
pm2 startup
```

### Docker 배포

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 8080

CMD ["node", "cam-socket-server-example.js"]
```

## 문제 해결

### 연결 문제

1. 방화벽 설정 확인
2. 포트 사용 가능 여부 확인
3. CORS 설정 확인

### 메모리 누수

1. 연결 해제 시 이벤트 리스너 정리
2. 주기적인 메모리 사용량 모니터링

### 성능 최적화

1. 연결 풀링 사용
2. 메시지 압축 활성화
3. 적절한 재연결 설정

## 라이선스

MIT License

## 기여

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
