const { createServer } = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

// 쿠키 파싱 함수
function parseCookies(cookieHeader) {
	if (!cookieHeader) return {};

	const cookies = {};
	cookieHeader.split(';').forEach((cookie) => {
		const [name, value] = cookie.trim().split('=');
		if (name && value) {
			cookies[name] = value;
		}
	});
	return cookies;
}

// 설정 파일 로드
function loadConfig() {
	try {
		const configPath = path.join(__dirname, 'socket-server-config.dev.json');
		const configData = fs.readFileSync(configPath, 'utf8');
		return JSON.parse(configData);
	} catch (error) {
		console.warn('설정 파일을 로드할 수 없어 기본값을 사용합니다:', error);
		return {
			server: { port: 8080, host: 'localhost' },
			channels: { camPrint: 'cam/print' },
			clients: { maxConnections: 100 },
			reconnect: { maxAttempts: 5, interval: 3000 },
			logging: { level: 'debug', console: true },
			data: { simulation: { enabled: true, interval: 2000 } }
		};
	}
}

const config = loadConfig();

// HTTP 서버 생성
const httpServer = createServer();

// Socket.IO 서버 생성
const io = new Server(httpServer, {
	cors: {
		origin: '*', // 실제 운영에서는 특정 도메인으로 제한
		methods: ['GET', 'POST'],
		credentials: true // 쿠키 전송 허용
	},
	transports: ['websocket', 'polling']
});

// JWT 인증 미들웨어 (서버 사이드 쿠키 처리)
io.use((socket, next) => {
	try {
		console.log('🔐 JWT 인증 미들웨어 실행');
		console.log('🔐 소켓 ID:', socket.id);
		console.log('🔐 요청 헤더:', socket.handshake.headers);
		console.log('🔐 쿠키 헤더:', socket.handshake.headers.cookie);

		// 쿠키 헤더에서 JWT 토큰 추출
		const cookies = parseCookies(socket.handshake.headers.cookie);
		console.log('🍪 파싱된 쿠키:', cookies);
		console.log('🍪 쿠키 키들:', Object.keys(cookies));

		// JWT 토큰 확인 (jwt 또는 refreshToken)
		const jwtToken = cookies.jwt || cookies.refreshToken;

		if (!jwtToken) {
			console.log('❌ JWT 토큰이 없습니다');
			console.log('❌ 가능한 원인:');
			console.log('   - 쿠키가 설정되지 않음');
			console.log('   - 쿠키 도메인/포트 불일치');
			console.log('   - sameSite 설정 문제');
			console.log('   - httpOnly 쿠키가 소켓 연결에 전송되지 않음');

			// 개발 환경에서는 인증을 우회할 수 있도록 설정
			if (process.env.NODE_ENV === 'development') {
				console.log('🔧 개발 환경: 인증을 우회하고 진행합니다.');
				socket.jwtToken = 'dev-token';
				socket.user = { token: 'dev-token' };
				return next();
			}

			return next(new Error('인증 토큰이 필요합니다.'));
		}

		console.log('✅ JWT 토큰 발견 (길이:', jwtToken.length, ')');
		console.log('✅ 토큰 시작 부분:', jwtToken.substring(0, 20) + '...');

		// JWT 토큰을 소켓 객체에 저장 (나중에 사용)
		socket.jwtToken = jwtToken;
		socket.user = { token: jwtToken }; // 임시 사용자 정보

		console.log('✅ JWT 인증 성공');
		next();
	} catch (error) {
		console.error('❌ JWT 인증 오류:', error);
		next(new Error('인증 처리 중 오류가 발생했습니다.'));
	}
});

// cam/print 채널 구독자들
const camPrintSubscribers = new Set();

// 출력물 상태 데이터 (실제로는 데이터베이스에서 관리)
let printJobs = [
	{
		id: 'job-001',
		fileName: 'tooth_model_001.stl',
		status: 'waiting',
		progress: 0,
		startTime: null,
		estimatedTime: null,
		priority: 'normal'
	},
	{
		id: 'job-002',
		fileName: 'tooth_model_002.stl',
		status: 'printing',
		progress: 45,
		startTime: new Date(Date.now() - 300000), // 5분 전
		estimatedTime: new Date(Date.now() + 600000), // 10분 후
		priority: 'high'
	}
];

// 진행률 데이터
let progressData = {
	today: { percent: 32.5, remaining: 650, total: 2000 },
	urgent: { percent: 15.2, remaining: 320, total: 2100 },
	yesterday: { percent: 32.5, remaining: 650, total: 2000 },
	monthly: { percent: 32.5, remaining: 650, total: 2000 },
	totalAmount: 2000,
	remainingAmount: 650
};

// Socket.IO 연결 처리
io.on('connection', (socket) => {
	console.log(`✅ 새로운 CAM 클라이언트가 연결되었습니다. (ID: ${socket.id})`);
	console.log('🔐 인증된 사용자 토큰:', socket.jwtToken ? '토큰 존재' : '토큰 없음');

	// 클라이언트에게 연결 확인 메시지 전송
	socket.emit('message', {
		type: 'connection',
		message: 'CAM Socket.IO 서버에 인증되어 연결되었습니다.',
		socketId: socket.id,
		authenticated: true
	});

	// 구독 요청 처리
	socket.on('subscribe', (data) => {
		console.log('구독 요청:', data);
		handleSubscribe(socket, data);
	});

	// 요청 처리
	socket.on('request', (data) => {
		console.log('요청:', data);
		handleRequest(socket, data);
	});

	// 명령 처리
	socket.on('command', (data) => {
		console.log('명령:', data);
		handleCommand(socket, data);
	});

	// 연결 종료 처리
	socket.on('disconnect', (reason) => {
		console.log(`CAM 클라이언트 연결이 종료되었습니다. (ID: ${socket.id}, 이유: ${reason})`);
		camPrintSubscribers.delete(socket);
	});

	// 에러 처리
	socket.on('error', (error) => {
		console.error(`Socket.IO 에러 (ID: ${socket.id}):`, error);
		camPrintSubscribers.delete(socket);
	});
});

// 구독 처리
function handleSubscribe(socket, data) {
	// 인증 확인
	if (!socket.jwtToken) {
		console.log('❌ 인증되지 않은 사용자의 구독 시도:', socket.id);
		socket.emit('error', {
			message: '인증이 필요합니다.',
			code: 'AUTH_REQUIRED'
		});
		return;
	}

	const camPrintChannel = config.channels.camPrint || 'cam/print';
	if (data.channel === camPrintChannel) {
		console.log('✅ 인증된 사용자 구독:', socket.id);
		camPrintSubscribers.add(socket);

		socket.emit('subscribe', {
			channel: camPrintChannel,
			message: `${camPrintChannel} 채널에 인증되어 구독되었습니다.`,
			socketId: socket.id,
			authenticated: true
		});

		// 구독 즉시 현재 상태 전송
		sendPrintStatus(socket);
		sendPrintProgress(socket);
	}
}

// 요청 처리
function handleRequest(socket, data) {
	// 인증 확인
	if (!socket.jwtToken) {
		console.log('❌ 인증되지 않은 사용자의 요청:', socket.id);
		socket.emit('error', {
			message: '인증이 필요합니다.',
			code: 'AUTH_REQUIRED'
		});
		return;
	}

	const camPrintChannel = config.channels.camPrint || 'cam/print';
	if (data.channel === camPrintChannel) {
		console.log('✅ 인증된 사용자 요청:', socket.id, data.data.action);
		switch (data.data.action) {
			case 'getStatus':
				sendPrintStatus(socket);
				break;

			case 'getProgress':
				sendPrintProgress(socket);
				break;

			default:
				socket.emit('error', {
					message: '알 수 없는 요청 액션입니다.',
					action: data.data.action
				});
		}
	}
}

// 명령 처리
function handleCommand(socket, data) {
	// 인증 확인
	if (!socket.jwtToken) {
		console.log('❌ 인증되지 않은 사용자의 명령:', socket.id);
		socket.emit('error', {
			message: '인증이 필요합니다.',
			code: 'AUTH_REQUIRED'
		});
		return;
	}

	const camPrintChannel = config.channels.camPrint || 'cam/print';
	if (data.channel === camPrintChannel) {
		console.log('✅ 인증된 사용자 명령:', socket.id, data.data.action);
		switch (data.data.action) {
			case 'startPrint':
				startPrintJob(data.data);
				break;

			case 'stopPrint':
				stopPrintJob(data.data.jobId);
				break;

			default:
				socket.emit('error', {
					message: '알 수 없는 명령 액션입니다.',
					action: data.data.action
				});
		}
	}
}

// 출력물 상태 전송
function sendPrintStatus(socket) {
	socket.emit('cam/print/status', printJobs);
}

// 진행률 데이터 전송
function sendPrintProgress(socket) {
	socket.emit('cam/print/progress', progressData);
}

// 모든 cam/print 구독자에게 상태 브로드캐스트
function broadcastPrintStatus() {
	io.to('cam/print').emit('cam/print/status', printJobs);

	// 개별 구독자들에게도 전송 (fallback)
	camPrintSubscribers.forEach((client) => {
		if (client.connected) {
			client.emit('cam/print/status', printJobs);
		}
	});
}

// 모든 cam/print 구독자에게 진행률 브로드캐스트
function broadcastPrintProgress() {
	io.to('cam/print').emit('cam/print/progress', progressData);

	// 개별 구독자들에게도 전송 (fallback)
	camPrintSubscribers.forEach((client) => {
		if (client.connected) {
			client.emit('cam/print/progress', progressData);
		}
	});
}

// 출력 작업 시작
function startPrintJob(printData) {
	const job = printJobs.find((j) => j.id === printData.fileId);
	if (job) {
		job.status = 'printing';
		job.startTime = new Date();
		job.estimatedTime = new Date(Date.now() + 600000); // 10분 후

		// 상태 업데이트 브로드캐스트
		broadcastPrintStatus();

		// 알림 전송
		broadcastNotification({
			type: 'info',
			message: `CAM 출력 작업이 시작되었습니다: ${job.fileName}`
		});

		// 진행률 시뮬레이션 시작
		simulatePrintProgress(job.id);
	}
}

// 출력 작업 중지
function stopPrintJob(jobId) {
	const job = printJobs.find((j) => j.id === jobId);
	if (job && job.status === 'printing') {
		job.status = 'paused';

		// 상태 업데이트 브로드캐스트
		broadcastPrintStatus();

		// 알림 전송
		broadcastNotification({
			type: 'warning',
			message: `CAM 출력 작업이 중지되었습니다: ${job.fileName}`
		});
	}
}

// 알림 브로드캐스트
function broadcastNotification(notification) {
	io.to('cam/print').emit('cam/print/notification', notification);

	// 개별 구독자들에게도 전송 (fallback)
	camPrintSubscribers.forEach((client) => {
		if (client.connected) {
			client.emit('cam/print/notification', notification);
		}
	});
}

// 출력 진행률 시뮬레이션
function simulatePrintProgress(jobId) {
	const job = printJobs.find((j) => j.id === jobId);
	if (!job || job.status !== 'printing') return;

	const simulationInterval = config.data?.simulation?.interval || 2000;

	const interval = setInterval(() => {
		if (job.status !== 'printing') {
			clearInterval(interval);
			return;
		}

		job.progress += Math.random() * 5; // 0-5% 랜덤 증가

		if (job.progress >= 100) {
			job.progress = 100;
			job.status = 'completed';
			clearInterval(interval);

			// 완료 알림
			broadcastNotification({
				type: 'success',
				message: `CAM 출력 작업이 완료되었습니다: ${job.fileName}`
			});
		}

		// 진행률 업데이트 브로드캐스트
		broadcastPrintStatus();

		// 전체 진행률 데이터 업데이트
		updateProgressData();
		broadcastPrintProgress();
	}, simulationInterval); // 설정에서 가져온 간격으로 업데이트
}

// 전체 진행률 데이터 업데이트
function updateProgressData() {
	const completedJobs = printJobs.filter((j) => j.status === 'completed').length;
	const totalJobs = printJobs.length;

	progressData.today.percent = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
	progressData.today.remaining = Math.max(0, progressData.today.total - completedJobs);

	// 다른 통계도 업데이트 (실제로는 데이터베이스에서 계산)
	progressData.remainingAmount = Math.max(0, progressData.totalAmount - completedJobs);
}

// 서버 시작
const PORT = process.env.PORT || config.server.port || 8080;
const HOST = config.server.host || 'localhost';

httpServer.listen(PORT, HOST, () => {
	console.log(`CAM Socket.IO 서버가 ${HOST}:${PORT}에서 실행 중입니다.`);
	console.log(`Socket.IO URL: ${config.server.protocol}://${HOST}:${PORT}`);
	console.log('설정:', JSON.stringify(config, null, 2));
});

// 정기적인 상태 업데이트 (선택사항)
setInterval(() => {
	// 연결된 클라이언트 수 로깅
	const connectedClients = io.engine.clientsCount;
	console.log(
		`연결된 CAM 클라이언트: ${connectedClients}, cam/print 구독자: ${camPrintSubscribers.size}`
	);
}, 30000); // 30초마다

// 프로세스 종료 시 정리
process.on('SIGINT', () => {
	console.log('CAM Socket.IO 서버를 종료합니다...');
	io.close(() => {
		httpServer.close(() => {
			console.log('CAM Socket.IO 서버가 정상적으로 종료되었습니다.');
			process.exit(0);
		});
	});
});
