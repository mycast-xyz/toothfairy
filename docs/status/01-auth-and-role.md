# 01. 인증 / 권한 (Auth & Role)

> 핵심 버그: **CAM/센터 관리자에게 권한을 이임해도 계속 `user`로 보임.**

## 🎯 Phase 0 실측 결과 — 원인 확정 (2026-06-30, 백엔드 코드+DB 직접 확인)

백엔드(`toothfairy-server`, Express+Sequelize+PostgreSQL) 코드와 실제 DB를 확인한 결과,
**원인은 "매핑 부재(A)"가 아니라 "토큰 stale(B)"** 로 확정됨.

- **roles 테이블 `name`이 이미 enum 문자열이다** (매핑 정상):
  | id | name | description |
  |----|------|------|
  | 1 | `all_admin` | 전체관리자 |
  | 2 | `all_cam` | 캠전체관리자 |
  | 3 | `all_center` | 센터전체관리자 |
  | 4 | `user` | 기본 |
- 로그인(`LoginController.ts:57-58`)은 `Role.findByPk(user.roleId).name`을 JWT `userRole`에 넣는다 → enum이 정확히 전달됨.
- **그런데 리프레시(`AccessTokenController.ts:104,119`)가 DB를 재조회하지 않고 옛 토큰의 `userRole`을 그대로 복사**한다.
- 이임 시 **기존 토큰을 무효화하지 않음** → 액세스 토큰 만료 후 자동 리프레시가 옛 역할(`user`)을 무한 연장.
- 결과: 이임해도 **완전 재로그인 전까지** 옛 역할 유지 → "계속 user로 보임".

### 추가 발견 (백엔드 측)
1. ⚠️ **`all_lab` 역할이 DB roles 테이블에 없음** → 기공소(lab) 사용자 역할 배정 불가. **INSERT 필요.**
2. 현재 DB 사용자 전원 `all_admin`. (테스트한 cam/center 계정은 현재 DB에 없음)
3. 미승인(`isPermitted=false`) 사용자는 로그인 자체가 차단됨(`LoginController.ts:48-54`, "계정이 비활성화되었습니다") → 프론트의 "승인 대기 화면" 가정은 **로그인 전 단계**가 아니라 적용 불가.

### 수정 방향 → ✅ 구현·검증 완료 (2026-06-30)
- ✅ (백엔드) **리프레시가 DB에서 현재 역할 재조회** — `AccessTokenController.refresh`가 `User.findByPk(userUUID)` → `Role.name`을 새 토큰에 반영. 역할 변경이 **재로그인 없이 ≤15분(액세스 토큰 만료 주기) 자동 반영**.
- ✅ (백엔드) **비활성화/삭제 계정은 리프레시 401** → 프론트가 쿠키 삭제 후 `/login`으로 자동 로그아웃.
- ✅ (백엔드) **`all_lab` 역할 INSERT** (roles id=5).
- ✅ (프론트) 권한표 단일화 (`PermissionService.canAccessPage` → `MENU_PERMISSIONS` 파생), `userInfo` 쿠키 maxAge 30초→15분, `/login/*` 공개경로 버그 수정.
- roleId→enum 매핑은 백엔드 `Role.name`이 이미 enum이라 **불필요**.

> **E2E 검증**: 테스트 계정 생성 → user 로그인 → DB에서 all_cam 이임 → 리프레시 → 토큰 role이 `user`→`all_cam`으로 전환 확인. 비활성화 시 리프레시 401 확인.
> ❗남은 결정(A 채택): "초 단위 즉시"가 아니라 ≤15분 자동 반영. 즉시 필요 시 `users.token_invalidated_at` 컬럼 + 미들웨어 추가 필요(미구현).

---

> (아래는 초기 코드 분석 시점의 상세 기록. 위 확정 결과로 "매핑 부재" 가설은 기각됨 — roles.name이 enum이라 매핑은 정상이고, 실제 원인은 stale 토큰임.)

## 관련 파일
- 게이트: `src/hooks.server.ts` ★실제 enforcement★, `src/routes/+layout.server.ts`(중복 디코딩), `src/routes/+layout.ts`
- 로그인: `src/routes/login/+page.server.ts`, `src/routes/api/auth/token/+server.ts`
- auth 서비스: `src/app/service/auth/{AuthService,AuthTokenService,TokenRefreshService,PermissionService,UserActivityService}.ts`
- 사용자관리: `src/app/service/user/{UserApiService,UserStore}.ts`, `src/app/view/userrole/*`, `src/routes/setting/{user,userrole}`
- 모델/설정: `src/app/model/user/UserRole.ts`, `src/app/config/application.dev.json`, `src/app/service/ConfigService.ts`

---

## role 생명주기
1. **로그인** (`login/+page.server.ts`) → 백엔드 `POST /api/v0/account/login`(URL 하드코딩 `:33`) → JWT 발급.
   쿠키 3종 저장: `access_token`(`:91`)·`refresh_token`(`:102`)·`userInfo`(`:116-138`, 모두 httpOnly).
   role 추출: `role: decoded.userRole || decoded.role || 'user'` (`:123`).
2. **hooks.server.ts** (요청마다): JWT 디코딩(`:53`) → `userRole = decoded.userRole || decoded.role`(`:78`) → 없으면 userInfo 보충(`:81-93`) → `userRole || 'user'`(`:97`) → `locals.user`(`:100`) → `PermissionService.canAccessPage()`로 접근제어, 실패 시 `/`로 리다이렉트(`:135-142`).
3. **+layout.server.ts**: 같은 디코딩을 **중복** 수행(`:21-82`), `userRole || 'user'`(`:68`) → `user` 반환.
4. **SliderMenu** (`view/desktop/menu/SliderMenu.svelte:13`): `data?.user?.role || 'user'` → `getFilteredMenus` → `MENU_PERMISSIONS`(`UserRole.ts:23-147`)로 메뉴 렌더.

→ 모든 단계가 `|| 'user'` 폴백. JWT에 role이 없거나 enum이 아니면 **대시보드/캘린더만** 노출.

---

## 🐛 근본 원인 (확정)

### role이 2개로 분리됨
- **(A) 메뉴/권한용 문자열 enum** — `UserRole.ts:2` `'all_admin'|'all_lab'|'all_center'|'all_cam'|'admin'|'user'`. 출처는 **오직 JWT 클레임**.
- **(B) 관리/이임용 숫자** — `UserApiService.ts:13-28`의 **별도 `User` 인터페이스**가 `roleId:number`(`:18`) + `role?:Role{id,name}`(`:21,24-28`). `Role.name`은 자유 문자열(예 "관리자"), enum 아님.
- ⚠️ 동일한 이름 `User`가 model과 service에서 **서로 다른 구조**로 정의됨 → 혼란의 근원.

### 매핑 부재 (전 소스 검색 0건)
- `roleId`(숫자) → enum 변환 코드 **없음**. `roleId`는 `EditUserRoleModal`(`:14,27,104`)/`UserStore`(`:130,214`)/`UserApiService`(`:18,255`)/`userrole/+page.svelte:150`에서 **숫자 비교·전송용**으로만 쓰임.
- 역방향(enum 리터럴 ↔ roleId) 매칭도 0건.

### 이임해도 당사자 세션 미반영
- 이임 경로: `setting/user/+page.svelte:43-45`(`window.userData`) → `EditUserRoleModal.svelte:26-29` → `UserStore.updateUserRole:214-229` → `UserApiService.updateUserRole:253-265` (`PATCH {setting.users}/:id/role`, body `{roleId,isPermitted}`).
- 성공 시 `userStore.updateUser(response.data)`(`UserStore.ts:217`) — **어드민 화면 목록 store만** 갱신. 당사자 무관.
- 당사자 메뉴/권한은 JWT→쿠키→`locals.user.role`에서 옴. **`updateUserRole`는 JWT를 재발급하지도, 토큰 갱신을 트리거하지도 않음.**
- → **재로그인(새 JWT) 전까지 계속 `'user'`.** 보충 안전망 `userInfo` 쿠키마저 `maxAge:30`초 버그(`login:137`, `hooks:364`)로 30초 만에 소멸.

---

## ⚠️ 추가 확인된 문제

### 권한표 불일치 — "메뉴엔 보이는데 진입 차단"
- `PermissionService.pagePermissions`(`PermissionService.ts:26-36`)와 `MENU_PERMISSIONS`(`UserRole.ts`)가 어긋남.
  예: `/lab/request`가 pagePermissions엔 `['all_admin']`(`:43상당`), MENU엔 `['all_lab','all_admin']`(`UserRole.ts:43`) → `all_lab`은 메뉴는 보이나 hooks에서 차단.
- `/lab/requestlist`, `/lab/delivery`, `/cam/manage`, `/center/print`, `/setting/*`, `/calender`, `/main` 다수가 pagePermissions에 **누락** → 비-admin은 `requiredRoles=[]`로 전부 차단(admin만 무조건 통과).
- 경로 표기도 상이: MENU `/setting/...` vs pagePermissions `/settings`·`/center/invoice`(실제 라우트와 매칭 안 됨).
- `MENU_PERMISSIONS:117-130` "매출/재료 통계"가 path를 `/setting/user`·`/setting/userrole`로 잘못 재사용 → 통계 클릭 시 사용자관리로 이동.

### 토큰 리프레시
- **엔드포인트 불일치**: hooks `POST /api/v0/auth/refresh`(`:178`, 하드코딩) vs config `/api/v0/account/refresh`(`application.dev.json:27`).
- **응답 포맷 불일치**: hooks는 `{accessToken,refreshToken}`(`:201-202`) 기대, `AuthService.refreshJwtToken`은 `{success,token}`(`AuthService.ts:58`) 기대.
- **클라 리프레시 3종 사실상 死**: `AuthTokenService`/`TokenRefreshService`/`UserActivityService`가 `localStorage['auth_token']`에 의존하나 **로그인이 localStorage를 안 채움**. `HeaderMenu.svelte:14-23` 마운트 후에야 `authService.getJwtToken()`으로 채워짐 → 그 전엔 무동작. 실질 리프레시는 **hooks(서버)만** 신뢰 가능.
- **autoRefresh 설정 死**: `ConfigService`의 `isAutoRefreshEnabled` 등(`:460-481`) 호출처 0건. 리프레시 서비스는 하드코딩 상수 사용.
- `UserActivityService` destroy의 `removeEventListener`가 매번 새 익명함수라 **리스너 미제거**(`:132-145`) → 누수.

### 보안
- `api/auth/token/+server.ts:66-69`가 httpOnly 토큰을 **평문 JSON으로 반환** → `AuthService.getJwtToken`+`HeaderMenu`가 localStorage로 이전 → XSS 노출면 확대, httpOnly 무력화. (문서 `JWT_TOKEN_REFRESH_README.md:169-173`의 "httpOnly로 XSS 방지" 주장과 상충.)
- JWT 전체 페이로드를 콘솔에 로깅: `hooks.server.ts:57-72,230-264`, `+layout.server.ts:25-40`, `login:76`.

### 죽은/미사용
- `PermissionGuard.svelte` 및 `PermissionService.canAccessFeature/getPermissionLevel` 호출처 0건(추정 미사용). 실제 enforcement는 hooks의 `canAccessPage`만.
- `service/menu/MenuService.ts`(0줄), `routes/setting/user/+page.ts`(빈 파일), `SiderMenuService`=`AdminSiedMenuService`(파일명 오타, 사이드바 토글 전용·role 무관).
- `getPermissionLevel`의 `Record<UserRole,number>`(`:49-55`)에 `'admin'` 키 누락.

---

## ✅ 할 일

### 백엔드 계약 필요 (프론트 단독 불가)
1. **JWT `userRole` 클레임 = roleId 매핑 단일 소스.** 로그인/리프레시 시 사용자의 현재 `roleId`를 enum(`all_cam` 등)으로 변환해 클레임에 포함.
2. **이임 후 토큰 무효화/재발급 전략.** role 변경 시 기존 토큰 무효화 또는 짧은 access TTL + 리프레시에서 최신 role 반영.
3. **리프레시 경로/응답 스키마 확정** (`/account/refresh` vs `/auth/refresh`, `{success,token}` vs `{accessToken,refreshToken}`).

### 프론트
4. **roleId→enum 매핑 도입** 또는 이중 `User` 모델 정리. (`UserRole.ts:2` ↔ `UserApiService.ts:13-28`)
5. **권한표 단일화** — `MENU_PERMISSIONS`와 `pagePermissions`를 하나의 소스로 통합, 누락 경로 보강, 경로 표기 일치.
6. **중복 디코딩 통합** — hooks/+layout.server/login의 role 추출을 공용 함수로.
7. **`userInfo` 쿠키 `maxAge` 수정** (`30`→의도값; `login:137`, `hooks:364`).
8. **민감 로그 제거**, `/api/auth/token` 평문 반환 제거, localStorage 토큰 의존 제거.
9. 하드코딩 URL → ConfigService, autoRefresh 배선 또는 제거, `UserActivityService` 리스너 누수 수정, 통계 메뉴 경로 오류 수정(`UserRole.ts:117-130`).
10. 모달 데이터 전달을 `window.*` 전역 → props로, `any` 축소, 죽은 파일 정리.

> 빠른 진단: 이임된 매니저로 로그인 후 콘솔에서 `🔍 사용자 역할 (userRole)/(role)` 값 확인 → A(매핑부재)/B(stale)/빈값 중 무엇인지 판별.
