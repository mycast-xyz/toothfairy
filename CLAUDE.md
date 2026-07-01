# CLAUDE.md — ToothFairy(킹덕) 작업 가이드

> 이 파일은 Claude(및 개발자)가 이 저장소에서 작업할 때 **가장 먼저 읽는 기준 문서**다.
> 섹터별 상세 현황/할 일은 [`docs/status/`](./docs/status/README.md)에 있다. 작업 전 해당 섹터 문서를 반드시 확인할 것.

---

## 1. 프로젝트 한 줄 정의

치과 **기공소(lab) · 기공센터(center) · CAM 출력**을 위한 B2B 종합 관리 시스템.
프론트엔드 단독 저장소이며 **백엔드(REST + Socket.IO)는 별도 서버**다.

**가장 중요한 3대 핵심 기능** (현재 모두 "개발되다 만" 상태):
1. **센터** — 출력물(STL) 검수 + 청구서(invoice) + 거래처 관리
2. **캠파일** — 파일 데이터 흐름(수신→다운로드→완료, 실시간 모니터링)
3. **기공소 의뢰목록** — 의뢰서 등록 + 목록/조회

---

## 2. 기술 스택

- **SvelteKit 2 + Svelte 5.24 + TypeScript**
- **빌드/배포**: Vite + `@sveltejs/adapter-static` → **CSR/SPA**(`fallback: index.html`)
- **스타일**: Tailwind CSS 3.4 (`forms`/`typography`/`container-queries`) + SCSS
- **상태관리**: Svelte store(`writable`/`derived`) — 외부 상태 라이브러리 없음
- **HTTP**: Axios / **실시간**: `socket.io-client`
- **3D**: Three.js + STLLoader / **PDF**: 외부 Playwright 서버 중계(과거 jsPDF)
- **패키지 매니저**: pnpm

### 명령어
```bash
pnpm dev            # 개발 서버 (localhost:5173)
pnpm build          # 프로덕션 빌드
pnpm check          # svelte-check 타입 검증  ← 작업 후 반드시 실행
pnpm lint           # prettier + eslint
pnpm format         # prettier --write
pnpm test           # vitest --run
```
> 백엔드가 떠 있어야 데이터가 보인다: REST `http://localhost:3000`, Socket.IO `ws://localhost:30090`.

---

## 3. 아키텍처 — 계층 분리 (반드시 준수)

```
src/
├── app/
│   ├── config/     application.{dev,prod}.json + schema.json  → ConfigService로 로드
│   ├── model/      도메인 타입/인터페이스 (cam, company, invoice, lab/request, user...)
│   ├── service/    ★비즈니스 로직 + 상태(writable store)★  (auth, cam, invoice, request, user, menu, calendar, validation)
│   ├── view/       UI 컴포넌트 — desktop/ 와 mobile/ 분리, 공통은 view/components/
│   └── view-framework/  모달 프레임 등
├── routes/         ★얇은 진입점★ — 로직은 service에 위임, 라우트는 조립만
└── hooks.server.ts ★실제 인증/권한 enforcement 게이트★ (아래 5장)
```

**계층 규칙**
- 비즈니스 로직은 **service**에. 라우트(`+page.svelte`/`+page.ts`)에 로직을 넣지 말 것.
- API 호출은 service에 캡슐화. 컴포넌트에서 직접 `fetch`/`axios` 금지.
- 타입은 **model**에. 화면/서비스에서 같은 인터페이스를 재정의하지 말 것.

---

## 4. 코드 컨벤션 (이 저장소의 실제 관례)

1. ⚠️ **레거시 Svelte 문법을 쓴다** — props `export let`, 반응식 `$:`, 조건부 클래스 `class:`.
   일부 신규 파일만 runes(`$state`/`$props`/`$derived`)를 섞어 씀 → **혼용 상태**.
   **기존 파일을 runes로 마이그레이션하지 말 것.** 새 파일은 주변 파일 스타일을 따른다.
2. **엔드포인트/서버 주소 하드코딩 금지.** 반드시 `application.dev.json`의 `api.endpoints.*`에 정의하고
   `ConfigService.getApiEndpoint(group, key)` / `getBackendUrl()`로 읽는다.
   (현 코드 곳곳에 `'http://'+hostname+':3000'` 하드코딩 + "ConfigService로 개선 예정" 주석이 방치돼 있음 → 새 코드는 따라하지 말 것.)
3. **주석/JSDoc/UI 라벨은 한국어.** store 인터페이스는 model 또는 service 상단에 JSDoc과 함께 선언.
4. **다크모드**: 색상 클래스에 `dark:` 변형을 함께(`bg-white dark:bg-gray-800`). 아이콘은 Remixicon(`ri-*`).
5. **작업 후 `pnpm check`로 타입 검증.** 손댄 파일 범위의 leftover `console.log`/unused import는 정리.
6. 커밋/푸시는 **사용자가 요청할 때만**.

---

## 5. 인증 / 권한(RBAC) — 동작 방식과 ★알려진 버그★

### 역할(role) 종류
`'all_admin' | 'all_lab' | 'all_center' | 'all_cam' | 'admin' | 'user'` (`src/app/model/user/UserRole.ts:2`)

### 흐름
1. 로그인(`routes/login/+page.server.ts`) → 백엔드가 **JWT 발급** → 쿠키 3종 저장(`access_token`/`refresh_token`/`userInfo`, 모두 httpOnly).
2. **`hooks.server.ts`가 실제 게이트**: 매 요청에서 JWT 디코딩 → `userRole = decoded.userRole || decoded.role` → `PermissionService.canAccessPage()`로 접근 제어.
3. `+layout.server.ts`가 같은 디코딩을 **중복** 수행해 `user`를 레이아웃에 전달 → `SliderMenu`가 `MENU_PERMISSIONS`로 메뉴 필터.
4. role을 못 찾으면 **모든 단계가 `|| 'user'`로 하드 폴백**.

### 🐛 핵심 버그: "CAM/센터 관리자에게 권한을 이임해도 계속 user로 보임"
**근본 원인 — role 시스템이 물리적으로 2개이고 둘을 잇는 매핑이 없다.**
- (A) 메뉴/권한용 **문자열 enum**(`all_cam` 등)은 **오직 JWT 클레임**에서만 나온다.
- (B) 어드민의 "이임"은 **`roleId:number`**(`UserApiService.updateUserRole` → `PATCH /setting/users/:id/role`)만 바꾼다.
- `roleId`(숫자) ↔ enum(문자열) **매핑 코드가 프론트 전역에 0건**.
- 어드민이 `roleId`를 바꿔도 **당사자의 JWT는 재발급되지 않으므로** 메뉴/권한은 폴백 `'user'` 그대로.
- 게다가 보충 안전망인 `userInfo` 쿠키가 **`maxAge:30`(초) 버그**(`login/+page.server.ts:137`, `hooks.server.ts:364`)로 30초 만에 사라짐.

**수정 방향** (상세: [`docs/status/01-auth-and-role.md`](./docs/status/01-auth-and-role.md))
- 백엔드 계약 필요: JWT 발급/리프레시 시 `roleId`를 **문자열 enum으로 매핑해 `userRole` 클레임에 포함** + role 변경 시 토큰 재발급/무효화.
- 프론트: roleId→enum 매핑 도입(또는 이중 모델 정리), `MENU_PERMISSIONS`와 `PermissionService.pagePermissions` **권한표 단일화**.

### ⚠️ 추가로 확인된 권한 함정
- **메뉴엔 보이는데 진입 시 차단**: `MENU_PERMISSIONS`(`UserRole.ts`)와 `PermissionService.pagePermissions`(`PermissionService.ts:26-36`)가 **불일치**. 비-`all_admin` 역할은 다수 페이지에서 `pagePermissions` 누락→차단. 경로 표기도 상이(`/settings` vs `/setting/...`).
- **리프레시 엔드포인트/응답 불일치**: hooks `/api/v0/auth/refresh` vs config `/api/v0/account/refresh`; 응답이 `{accessToken,refreshToken}`(hooks) vs `{success,token}`(AuthService).
- **클라이언트 리프레시 3종**(`AuthTokenService`/`TokenRefreshService`/`UserActivityService`)은 `localStorage['auth_token']`에 의존하나 **로그인이 localStorage를 안 채워** 사실상 死(HeaderMenu 마운트 후에야 채워짐). 실질 리프레시는 `hooks.server.ts`만 신뢰.
- **보안**: `routes/api/auth/token/+server.ts`가 httpOnly 토큰을 **평문 JSON으로 반환** → httpOnly 무력화. JWT 전체를 콘솔에 로깅하는 코드 다수.

---

## 6. 전역 기술부채 / 함정 (작업 시 주의)

- **`console.log` 폭증**: 파일당 50~68건씩(특히 `CamSocketService` 68, `center/show` 65, `InvoicePdfRenderer`/`CompanyForm` 55+). 손대는 파일에서 정리.
- **`any` 남발**: 화면 `data:any`, service 인자 `any`, `(window as any)` 모달 데이터 전달.
- **하드코딩 URL**: 여러 `+page.ts`/`hooks.server.ts`/`login`에 백엔드 주소·경로 직접 조립.
- **죽은 파일/코드** (정리 대상):
  `view/stlviewer/{backup,test}.svelte`, `routes/center/print/test.html`, `routes/setting/invoice/test.json`,
  `model/company/TestDentistry.json`, `model/lab/request/Request.ts`(파일명-내용 불일치),
  `view/request/HeaderBar.svelte`(미사용), `service/menu/MenuService.ts`(0줄), `routes/setting/user/+page.ts`(빈 파일).
- **`import { log } from 'three/tsl'`** — 3개 HeaderBar에 잘못 들어간 잔재(미사용).
- **소켓 포트 모순**: config `server.socket.port:8080` vs `baseUrl: ws://localhost:30090`, 문서는 또 8080.
- **`/lab/delivery`** — 메뉴/권한엔 등록됐으나 `routes/lab/delivery` 폴더 자체가 없음(깨진 링크).
- **모달 데이터 전달이 `window.userData`/`window.roleData` 전역**(props 대신) → SSR/타입 안전성 저하.

---

## 7. 3대 핵심 섹터 현황 요약 (상세는 docs/status)

| 섹터 | 동작하는 것 | 미완성/깨진 것 | 문서 |
|---|---|---|---|
| **인증/권한** | hooks 게이트, 로그인/JWT | role 이중구조 버그, 권한표 불일치, 리프레시 불일치 | [01](./docs/status/01-auth-and-role.md) |
| **센터** | STL 검수, 거래처 목록 | 청구서 절반 미완(치과탭 주석처리), 엔드포인트 불일치, 종류별 단가 미구현, PDF 서버 부재 | [02](./docs/status/02-center.md) |
| **캠파일** | REST 6종, 소켓 클라이언트 | `cam/manage` 빈 목업, complete 하드코딩, 검색 파라미터 충돌, 진행률 더미값 | [03](./docs/status/03-cam-file-flow.md) |
| **기공소 의뢰목록** | 데스크탑 등록 3스텝, 웹캠 | 저장 엔드포인트 하드코딩, 등록↔조회 필드 불일치, 모바일 미구현, 네이밍 혼란 | [04](./docs/status/04-lab-request.md) |

---

## 8. 작업 팀 에이전트

`.claude/agents/`에 역할별 서브에이전트 7종이 있다(기획/아키텍트/디자인/Svelte개발/백엔드연동/QA/코드리뷰).
권장 흐름: **기획 → 설계 → 구현(+백엔드) → 리뷰 → QA**. 상세는 `.claude/agents/README.md`.

## 9. Claude 작업 원칙 (이 저장소 한정)
- 손대기 전 **유사 기능의 model/service/view를 읽고 그 패턴을 따른다**. 새 추상화 발명 금지.
- **레거시 Svelte 문법 유지**, **엔드포인트 ConfigService 경유**, **로직은 service로**.
- 백엔드 응답 형태가 불확실하면 **추측해서 구현하지 말고** 가정한 계약을 명시하고 사용자에게 확인.
- 끝나면 **`pnpm check`** 로 검증하고, 검증 안 한 것은 "안 했다"고 정직히 보고.
