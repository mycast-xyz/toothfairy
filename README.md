# ToothFairy (킹덕)

치과 기공소 및 기공센터를 위한 종합 관리 시스템

## 📋 프로젝트 정보

- **프로젝트명**: ToothFairy (킹덕)
- **버전**: 1.0.0
- **프레임워크**: SvelteKit 2.0
- **언어**: TypeScript
- **스타일링**: Tailwind CSS
- **패키지 매니저**: pnpm

## 🚀 빠른 시작

### 필수 요구사항

- Node.js 18+
- pnpm 8+

### 설치 및 실행

```bash
# 의존성 설치
pnpm install

# 개발 서버 시작
pnpm dev

# 브라우저에서 열기
pnpm dev -- --open
```

### 빌드

```bash
# 프로덕션 빌드
pnpm build

# 빌드 결과 미리보기
pnpm preview
```

## 🏗️ 주요 기능

### 치과기공소 관리

- 의뢰서 등록 및 관리
- 의뢰 목록 조회
- 정산 관리
- 배송 관리

### 기공센터 관리

- 출력물 관리
- 청구서 관리
- 거래처 관리

### CAM 관리

- 출력물 관리
- 실시간 진행 상황 모니터링

### 사용자 관리

- 권한 기반 접근 제어
- 역할별 메뉴 관리

## 🔐 사용자 역할

- `all_admin`: 전체 관리자 (모든 기능 접근 가능)
- `all_lab`: 치과기공소 관리자
- `all_center`: 기공센터 관리자
- `all_cam`: CAM 관리자
- `user`: 일반 사용자

## 📱 반응형 디자인

- **데스크탑**: 사이드바 메뉴, 전체 기능
- **모바일**: 헤더 메뉴, 터치 최적화

## 🛠️ 개발 도구

```bash
# 타입 체크
pnpm check

# 린트 검사
pnpm lint

# 코드 포맷팅
pnpm format

# 테스트 실행
pnpm test
```

## 📚 문서

- [프로젝트 개요](./docs/PROJECT_OVERVIEW.md) - 프로젝트 전체 개요
- [개발 가이드](./docs/DEVELOPMENT_GUIDE.md) - 개발자를 위한 상세 가이드
- [API 문서](./docs/API_DOCUMENTATION.md) - 백엔드 API 엔드포인트
- [컴포넌트 가이드](./docs/COMPONENT_GUIDE.md) - UI 컴포넌트 사용법
- [배포 가이드](./docs/DEPLOYMENT_GUIDE.md) - 배포 방법 및 설정
- [설정 관리](./docs/CONFIG_MIGRATION_README.md) - 환경 설정 관리
- [소켓 설정](./docs/SOCKET_SETUP_README.md) - 실시간 통신 설정
- [CAM 소켓 IO](./docs/CAM_SOCKET_IO_README.md) - CAM 관련 소켓 통신

## 🌐 환경 설정

### 개발 환경

- **백엔드**: http://localhost:3000
- **프론트엔드**: http://localhost:5173
- **소켓**: ws://localhost:30090

### 환경 변수

`.env` 파일 생성:

```env
VITE_APP_ENV=dev
VITE_BACKEND_URL=http://localhost:3000
VITE_SOCKET_URL=ws://localhost:30090
```

## 🔧 기술 스택

- **프론트엔드**: SvelteKit 5.24.0, TypeScript
- **스타일링**: Tailwind CSS 3.4.9, SCSS
- **상태관리**: Svelte Store
- **HTTP 클라이언트**: Axios
- **실시간 통신**: Socket.IO Client
- **3D 렌더링**: Three.js
- **PDF 생성**: jsPDF, html2canvas
- **UI 컴포넌트**: Remixicon, Swiper, SortableJS

## 📄 라이선스

이 프로젝트는 비공개 프로젝트입니다.

## 🤝 기여

프로젝트 기여에 관심이 있으시면 관리자에게 문의해주세요.

## 📞 지원

기술적 문제나 문의사항이 있으시면 이슈를 생성해주세요.
