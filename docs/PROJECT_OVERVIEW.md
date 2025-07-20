# ToothFairy 프로젝트 개요

## 📋 프로젝트 정보

- **프로젝트명**: ToothFairy (킹덕)
- **버전**: 1.0.0
- **프레임워크**: SvelteKit 2.0
- **언어**: TypeScript
- **스타일링**: Tailwind CSS
- **패키지 매니저**: pnpm
- **배포**: Static Adapter (CSR 모드)

## 🎯 프로젝트 목적

치과 기공소 및 기공센터를 위한 종합 관리 시스템으로, 다음과 같은 기능을 제공합니다:

- **치과기공소**: 의뢰서 등록, 의뢰 목록, 정산, 배송 관리
- **기공센터**: 출력물 관리, 청구서 관리, 거래처 관리
- **CAM 관리**: 출력물 관리
- **사용자 관리**: 권한 기반 접근 제어

## 🏗️ 아키텍처

### 기술 스택

- **프론트엔드**: SvelteKit 5.24.0, TypeScript
- **스타일링**: Tailwind CSS 3.4.9, SCSS
- **상태관리**: Svelte Store
- **HTTP 클라이언트**: Axios
- **실시간 통신**: Socket.IO Client
- **3D 렌더링**: Three.js
- **PDF 생성**: jsPDF, html2canvas
- **UI 컴포넌트**: Remixicon, Swiper, SortableJS

### 프로젝트 구조

```
toothfairy/
├── src/
│   ├── app/                    # 애플리케이션 코어
│   │   ├── config/            # 설정 파일들
│   │   ├── model/             # 데이터 모델
│   │   ├── service/           # 비즈니스 로직
│   │   └── view/              # UI 컴포넌트
│   ├── routes/                # SvelteKit 라우트
│   └── utils/                 # 유틸리티 함수
├── static/                    # 정적 파일
└── docs/                      # 문서
```

## 🔐 인증 및 권한

### 사용자 역할

- `all_admin`: 전체 관리자 (모든 기능 접근 가능)
- `all_lab`: 치과기공소 관리자
- `all_center`: 기공센터 관리자
- `all_cam`: CAM 관리자
- `user`: 일반 사용자

### 권한 기반 접근 제어

- 페이지별 접근 권한 설정
- JWT 토큰 기반 인증
- 쿠키 기반 세션 관리

## 🌐 환경 설정

### 개발 환경

- **백엔드**: http://localhost:3000
- **프론트엔드**: http://localhost:5173
- **소켓**: ws://localhost:30090

### 프로덕션 환경

- 환경별 설정 파일 분리
- GitHub Pages 배포 지원

## 📱 반응형 디자인

- **데스크탑**: 사이드바 메뉴, 전체 기능
- **모바일**: 헤더 메뉴, 터치 최적화

## 🔧 개발 도구

- **린터**: ESLint, Prettier
- **타입 체크**: svelte-check
- **테스트**: Vitest
- **빌드**: Vite

## 📚 관련 문서

- [API 문서](./API_DOCUMENTATION.md)
- [설정 관리](./CONFIG_MIGRATION_README.md)
- [소켓 설정](./SOCKET_SETUP_README.md)
- [CAM 소켓 IO](./CAM_SOCKET_IO_README.md)
- [개발 가이드](./DEVELOPMENT_GUIDE.md)
- [배포 가이드](./DEPLOYMENT_GUIDE.md)
