const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

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
const server = http.createServer();

// WebSocket 서버 생성
const wss = new WebSocket.Server({ server });

// 연결된 클라이언트들을 저장
const clients = new Set();

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

// WebSocket 연결 처리
wss.on('connection', (ws) => {
	console.log('새로운 클라이언트가 연결되었습니다.');
	clients.add(ws);

	// 클라이언트에게 연결 확인 메시지 전송
	ws.send(
		JSON.stringify({
			type: 'connection',
			message: '소켓 서버에 연결되었습니다.'
		})
	);

	// 메시지 수신 처리
	ws.on('message', (message) => {
		try {
			const data = JSON.parse(message);
			handleMessage(ws, data);
		} catch (error) {
			console.error('메시지 파싱 오류:', error);
			ws.send(
				JSON.stringify({
					type: 'error',
					message: '잘못된 메시지 형식입니다.'
				})
			);
		}
	});

	// 연결 종료 처리
	ws.on('close', () => {
		console.log('클라이언트 연결이 종료되었습니다.');
		clients.delete(ws);
		camPrintSubscribers.delete(ws);
	});

	// 에러 처리
	ws.on('error', (error) => {
		console.error('WebSocket 에러:', error);
		clients.delete(ws);
		camPrintSubscribers.delete(ws);
	});
});

// 메시지 처리 함수
function handleMessage(ws, data) {
	console.log('수신된 메시지:', data);

	switch (data.type) {
		case 'subscribe':
			handleSubscribe(ws, data);
			break;

		case 'request':
			handleRequest(ws, data);
			break;

		case 'command':
			handleCommand(ws, data);
			break;

		default:
			ws.send(
				JSON.stringify({
					type: 'error',
					message: '알 수 없는 메시지 타입입니다.'
				})
			);
	}
}

// 구독 처리
function handleSubscribe(ws, data) {
	const camPrintChannel = config.channels.camPrint || 'cam/print';
	if (data.channel === camPrintChannel) {
		camPrintSubscribers.add(ws);
		ws.send(
			JSON.stringify({
				type: 'subscribe',
				channel: camPrintChannel,
				message: `${camPrintChannel} 채널에 구독되었습니다.`
			})
		);

		// 구독 즉시 현재 상태 전송
		sendPrintStatus(ws);
		sendPrintProgress(ws);
	}
}

// 요청 처리
function handleRequest(ws, data) {
	const camPrintChannel = config.channels.camPrint || 'cam/print';
	if (data.channel === camPrintChannel) {
		switch (data.data.action) {
			case 'getStatus':
				sendPrintStatus(ws);
				break;

			case 'getProgress':
				sendPrintProgress(ws);
				break;

			default:
				ws.send(
					JSON.stringify({
						type: 'error',
						message: '알 수 없는 요청 액션입니다.'
					})
				);
		}
	}
}

// 명령 처리
function handleCommand(ws, data) {
	const camPrintChannel = config.channels.camPrint || 'cam/print';
	if (data.channel === camPrintChannel) {
		switch (data.data.action) {
			case 'startPrint':
				startPrintJob(data.data);
				break;

			case 'stopPrint':
				stopPrintJob(data.data.jobId);
				break;

			default:
				ws.send(
					JSON.stringify({
						type: 'error',
						message: '알 수 없는 명령 액션입니다.'
					})
				);
		}
	}
}

// 출력물 상태 전송
function sendPrintStatus(ws) {
	ws.send(
		JSON.stringify({
			type: 'cam/print/status',
			data: printJobs
		})
	);
}

// 진행률 데이터 전송
function sendPrintProgress(ws) {
	ws.send(
		JSON.stringify({
			type: 'cam/print/progress',
			data: progressData
		})
	);
}

// 모든 cam/print 구독자에게 상태 브로드캐스트
function broadcastPrintStatus() {
	const message = JSON.stringify({
		type: 'cam/print/status',
		data: printJobs
	});

	camPrintSubscribers.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(message);
		}
	});
}

// 모든 cam/print 구독자에게 진행률 브로드캐스트
function broadcastPrintProgress() {
	const message = JSON.stringify({
		type: 'cam/print/progress',
		data: progressData
	});

	camPrintSubscribers.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(message);
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
			message: `출력 작업이 시작되었습니다: ${job.fileName}`
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
			message: `출력 작업이 중지되었습니다: ${job.fileName}`
		});
	}
}

// 알림 브로드캐스트
function broadcastNotification(notification) {
	const message = JSON.stringify({
		type: 'cam/print/notification',
		data: notification
	});

	camPrintSubscribers.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(message);
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
				message: `출력 작업이 완료되었습니다: ${job.fileName}`
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
server.listen(PORT, HOST, () => {
	console.log(`소켓 서버가 ${HOST}:${PORT}에서 실행 중입니다.`);
	console.log(`WebSocket URL: ${config.server.protocol}://${HOST}:${PORT}`);
	console.log('설정:', JSON.stringify(config, null, 2));
});

// 정기적인 상태 업데이트 (선택사항)
setInterval(() => {
	// 연결된 클라이언트 수 로깅
	console.log(`연결된 클라이언트: ${clients.size}, cam/print 구독자: ${camPrintSubscribers.size}`);
}, 30000); // 30초마다

// 프로세스 종료 시 정리
process.on('SIGINT', () => {
	console.log('서버를 종료합니다...');
	wss.close(() => {
		server.close(() => {
			console.log('서버가 정상적으로 종료되었습니다.');
			process.exit(0);
		});
	});
});
