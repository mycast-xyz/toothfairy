# 기획안 02 — 백엔드 점검 & 수정 로드맵

> 작성 2026-07-01 · 대상: `toothfairy-server`(REST 백엔드, Express4+TS+Sequelize6+PostgreSQL) + `toothfairy-socket-server`(Socket.IO, :30090)
> 방법: 읽기 전용 코드리뷰 에이전트 4개(인증·보안 / API로직 / 데이터모델 / 인프라)의 발견을 종합·중복제거.
> ⚠️ 이미 수정됨(중복 아님): refresh의 DB 역할 재조회, dev CORS `origin:true`, roles에 `all_lab` 추가.

---

## 0. 한눈 요약 — 가장 심각한 3가지

1. 🔴 **시크릿이 Git에 커밋됨** (두 레포 모두) — DB 비번(`102468`)·JWT 시크릿이 `application.prod.json`/`appdevjson.json`/`env.example`에 평문. `.gitignore` 추가돼도 **이미 추적 중이라 무효**. 시크릿 유출 시 **누구나 all_admin 토큰 위조 가능**(서버측 토큰 저장/검증 없음).
2. 🔴 **청구·수가 컨트롤러가 스키마 불일치로 전부 오작동** — Invoice/DentalLabPrice/DentalClinicPrice 컨트롤러가 모델에 없는 컬럼(camelCase/미존재)을 써서 조회는 **항상 500**, 저장·수정은 **사일런트 실패(무변경인데 200)**. 해당 기능 사실상 전부 불능(추정).
3. 🔴 **데이터 무결성 장치 부재** — 다중테이블 쓰기에 **트랜잭션 없음**(고아 레코드), **roles 시드 스크립트 자체가 없음**(신규 DB에서 가입 전면 불가), **마이그레이션 전략 없음 + `DROP TABLE` 파괴 스크립트**(prod 실행 시 데이터 전손).

---

## P0 — 즉시 조치

### 🔒 보안
- **P0-1. 커밋된 시크릿 제거 + 로테이션** (server: `config/application.prod.json:6-21`, `.gitignore:147`이 늦게 추가돼 무효 / socket: `appdevjson.json`, `src/config/application.{dev,prod}.json`, `env.example`). dev/prod/example이 **동일 JWT 시크릿** 공유(환경분리 실패).
  → ① 노출된 JWT 시크릿·DB 비번 **즉시 폐기·재발급** ② `git rm --cached` + 히스토리 정리(filter-repo/BFG) ③ 시크릿은 `.env`/시크릿매니저로만, 예시엔 placeholder만. `.env:9`의 주석 처리된 운영 DB 비번(`master028563818`)도 제거.
- **P0-2. 평문 비밀번호 로깅 제거** — `account/AccountController.ts:24` `console.log(id, password, name)` (이메일+평문 비번). 즉시 삭제.
- **P0-3. 시크릿 취약 폴백 제거** — `config.ts:26-28` env 미설정 시 `'default-access-secret'`로 자동 폴백 → 예측가능 시크릿으로 조용히 기동. **없으면 부팅 실패(fail-fast)** 로 변경. (소켓의 `validateConfig`가 REST엔 없음.)

### 🐛 기능 파손 (현재 죽은 기능)
- **P0-4. 청구(Invoice) 생성/수정 정합화** — `invoice/DentalInvoiceController.ts:231-237`, `invoice/CenterInvoiceController.ts:355-369` 등이 모델에 없는 `invoice_total/delivery_pay/pre_payment/invoice_list`로 create → 필수 `fileName/filePath/pdfType` 누락 → **항상 500**. update도 미존재 컬럼만 바꿔 **무변경 200**. 모델(파일기반 vs 금액기반 혼재) 정합화 필요.
- **P0-5. 수가 컨트롤러 snake/camel 정합화** — `dental-clinic-price/DentalClinicPriceController.ts`·`dental-lab-price/DentalLabPriceController.ts` 전 메서드가 `corpName`/`corpClientId`/`priceData`(camelCase) 사용 → 모델은 snake_case(`corp_name`, `corp_client_id`, `price_data`) → **조회 전부 500, 저장 사일런트 실패**. (`CorpClientController`는 올바르게 snake 사용 → 이 두 컨트롤러만 규약 위반.)
- **P0-6. roles 시드 스크립트 추가** — `servertable.sql:238-248`은 테이블 생성만, `INSERT INTO roles` 없음(시드 0건). `AccountController.ts:82-93`은 `user` 역할 없으면 500 → **신규 DB에서 가입 불가**. idempotent 시드(`INSERT ... WHERE NOT EXISTS`/`ON CONFLICT`)로 5개 역할 보장. `roles.name`에 값 제약 없어 오타 역할 생성 가능 → enum 집합 앱검증/DB제약 고정.
- **P0-7. 미초기화 모델 초기화** — `FolderMonitorLog`(`models/monitor/FolderMonitorLog.Vo.ts`)가 `models/index.ts`에서 init 안 됨. `CamFileController.ts:849`에서 사용 → **런타임 `Model not initialized`**. index.ts에 `initFolderMonitorLog(sequelize)` 추가.
- **P0-8. 소규모 확정 버그 2건**
  - `manager/Errors/InternalServerError.ts:9-11` — 500 클래스인데 `name='BadRequest'`, `resultCode=400` → 500 상황을 400으로 응답. 정정.
  - `price/PriceListController.ts:41` — 라우트는 `/list/:id`인데 핸들러가 `req.params.prkey`(항상 undefined) → `findByPk(undefined)`. `req.params.id`로 수정.

---

## P1 — 심각 (무결성·안정성·운영)

### 데이터 무결성
- **P1-1. 트랜잭션 도입** — 다중 테이블 쓰기 전부 원자화: `request/RequestController.ts:159-184`(폼+제품), `corp/CorpClientController.ts:203-306`(거래처+가격), `:378-448`(수정 시 destroy 후 재생성 실패→가격 전량 소실), `invoice/InvoiceController.ts:63-90`(활성 비활성화 후 create 실패→활성 0개). `sequelize.transaction()`으로 감싸기.
- **P1-2. 마이그레이션 체계 + 파괴 스크립트 격리** — `sequelize.sync` 비활성(`index.ts:68-72`), migration 미사용, 스키마가 산발 SQL로 표류. `servertable.sql`은 `DROP TABLE IF EXISTS`(라인 24,73,164,207,239,253) → prod 실행 시 전손. umzug/sequelize-cli 도입, DROP 스크립트는 dev 전용 격리.
- **P1-3. 스키마-모델 정의 상충 정리** — 동일 테이블에 2~3벌 상충 스크립트(모델 snake vs `sql/*` camelCase): `sql/create_dental_lab_price_table.sql`, `create_clinic_price_table.sql`(테이블명까지 `dental_corp_client` 오류), `create_corp_client_table(s).sql`. 문법오류 SQL(`create_corp_client_tables.sql:29-30,41-42` 트레일링콤마, `create_dental_def_price_table.sql:15`·`create_clinic_price_table.sql:15` 깨진 인덱스 참조). **정본 1벌만 남기고 삭제**. CREATE 자체가 없는 테이블도 작성: `login_logs`, `camFolderBackups`, `centerCompany`, `centerStlList`.
- **P1-4. cam_file_checks CHECK 제약 충돌** — 모델 `check_type` enum(`existence/integrity/metadata/manual`, `CamFileCheck.Vo.ts:118`) vs `servertable.sql:67` CHECK(`existence/integrity/virus_scan/format_validation/size_check`) → 교집합만 통과, `metadata/manual` insert 시 **DB CHECK 위반**. NULL/기본값도 불일치(`exists`, `folder_type`, `check_result`). 단일 소스로 통일.
- **P1-5. 하드삭제 → soft delete 정책 통일** — `RequestController.ts:858` `RequestForm.destroy()`(물리삭제, CASCADE로 제품까지) → 주문/청구 이력 소실. Invoice/Center* 등은 `paranoid:true`인데 핵심 주문만 하드삭제. 정책 통일.

### API 안정성
- **P1-6. async try/catch 부재 → 무응답(hang)** — Express4는 async throw를 못 잡음. `invoice/*`, `center/data/CenterDataController.ts:18,49`, `center/file/CenterFileController.ts:13`, `account/AccountController.ts:141` 등 다수. **공통 `asyncHandler` 래퍼** 도입 권장.
- **P1-7. 파괴적 작업이 GET** — `cam/folder/router.ts:12` `router.get('/upload', camFolderCleanup)`가 내부에서 `fs.remove`/백업 수행 → 브라우저 prefetch/크롤러가 데이터 파괴 유발. **POST로 변경**.
- **P1-8. 필수값 미검증으로 500** — `RequestController.ts:135-136`(`dentalClinic/dentalClinicId` 미검증 `.trim()`), `InvoiceController.ts:79-80`(`invoiceData.corpInfo` 바로 접근). 사전 검증 후 400.
- **P1-9. 청구 금액 계산 placeholder** — `center/CenterInvoiceController.ts:351-352` `unitPrice=1000` 하드코딩(주석도 "설정에서 가져와야 함"). 실제 타입별 단가(`normalPrice/remakePrice`) 미반영 → **청구액이 실제와 무관**. partial corpName 접미사도 목록(`corp_name`)과 생성(`${corp_name}pa`)이 달라 수치 불일치. (프론트 청구 미완성[docs/status/02]과 함께 도메인 재설계 필요.)
- **P1-10. archive 이중 finalize** — `cam/data/CamFileController.ts:297-302`(close 핸들러)와 `:312`(함수 끝) `finalize()` 2회 → "already finalized" throw 가능. finalize 단일화.

### 인증·운영
- **P1-11. 토큰 무효화 수단 도입** — 로그아웃/블랙리스트/리프레시 저장소 전무. 리프레시 토큰(24h) 탈취 시 회수 불가, 회전·재사용 탐지 없음. `redis_server` 설정이 이미 있으니 활용 → jti 저장, 로그아웃·역할변경 시 폐기, rotation.
- **P1-12. rate limiting + helmet 도입** — 로그인/가입/refresh 무제한(브루트포스). `express-rate-limit` + `helmet()` 미설치. (bcrypt rounds 15가 rate-limit 부재와 결합 시 CPU DoS. rounds 15 vs `UserController.ts:8`의 10 불일치 → 단일 상수 12 전후로.)
- **P1-13. 토큰 전체 로깅 제거** — `LoginController.ts:82-113`, `JsonWebToken.ts:62-114`, `AccessTokenController.ts:38-41,159-160` 등이 유효 토큰/페이로드를 콘솔 출력 → 로그 접근자 세션 탈취.
- **P1-14. graceful shutdown + uncaughtException 정책** — `index.ts:82-88` unhandledRejection/uncaughtException을 로깅만 하고 프로세스 유지(상태 오염 위험). SIGTERM/SIGINT 핸들러 없음. 소켓서버(`index.ts:251-265`)는 예외 후 자동 재시작 → 역시 위험. 정리 후 종료 + PM2/systemd에 복구 위임.

### 설정·경로
- **P1-15. OS 의존 하드코딩 경로 env화** — `\\192.168.0.37\backup\...`(`cam/folder/CamFolderController.ts` 8곳), `G:\test-folder\...`(socket `appdevjson.json` `folder_paths`), `C:\ffmpeg\bin\ffmpeg.exe`(`utils/youtubeUtils.ts:76`) → macOS에서 동작 불가. `config.networkFilePrefix`(이미 존재) 등 env로 통일. 소켓 파일모니터는 경로 불일치 시 조용히 **로컬 폴백 폴더 감시**(`BackgroundFileMonitorService`) → 정상처럼 보이나 무동작.
- **P1-16. 환경 오타 정정** — 두 레포 `.env`/`env.example`의 `NODE_ENV=developmentw`(끝 `w`) → **prod 설정이 영영 로딩 안 됨**. config 키 `LOG_LEVER`(오타) → LOG_LEVEL 미반영. `env.example`의 깨진 문자 `ß` 라인.
- **P1-17. 소켓 CORS `origin:'*'` + `credentials:true`** — `socket/index.ts:73,76` 사양 모순 + CSWSH 위험, `allowRequest`가 항상 허용(`:95-101`). 운영 origin 화이트리스트.
- **P1-18. 소켓↔REST JWT 시크릿 불일치 (확인 필요)** — 소켓 검증 시크릿(`54321FBE...`)과 REST 발급 시크릿(`secret-access-...`)이 달라 보임. 소켓이 REST 토큰을 이 시크릿으로 검증하면 **전량 서명 불일치**. → **AuthService 확인 후 시크릿 일치**시켜야 함(추정, 우선 확인).

---

## P2 — 품질·일관성·정리

- **P2-1. 응답 포맷 4종 혼재 표준화** — `{success,data}` / `{resultCode,item,resultMsg}` / `{resultCode,success,message}` / `{status,data}` 가 컨트롤러마다 다름. 공통 응답 헬퍼로 통일.
- **P2-2. console.log 대량 정리** — server 240~314건(상위 `CorpClientController` 50, `PriceListController` 49, `LoginController` 20), logger와 혼재. logger로 통일 + LOG_LEVEL 반영(`utils/logger.ts` 하드코딩 레벨).
- **P2-3. 죽은 코드/파일 제거** — `routes/corp/CenterCorpController.ts`(무참조 181줄), `account/AdminVerificationController.ts`(0바이트), 빈 스텁 메서드 다수(cam/center file 컨트롤러), `price` getById/getByKey 중복. `.DS_Store`(추적 3개), `src/debug_encoding.ts`·`test_holiday_sample.ts`(빌드대상), `create_tables.js`·`listtest.json`·빈 `kingduck-server@1.0.0`.
- **P2-4. 타입/스키마 위생** — `any` 남용(JSONB 페이로드 인터페이스화), ID 전략 혼용(users만 UUID, 나머지 serial + 문자열 비즈니스키), 타임스탬프 네이밍 혼재(created_at vs createdAt), 금액 타입 통일(DECIMAL), ENUM 이원화(Sequelize ENUM vs VARCHAR+CHECK), JSON vs JSONB.
- **P2-5. 보안 하드닝** — JWT `algorithms:['HS256']` 고정(sign/verify), 에러 응답 내부메시지 숨김(`AccountController.ts:126`), 사용자 열거 방지(로그인 실패 단일 메시지), 회원가입 이메일/비번 복잡도 검증, 인증방식 통일(Bearer vs 쿠키 이원화 `authMiddleware` vs `verifyAdminToken`).
- **P2-6. 경로탐색 하드닝** — `pdf/PdfController.ts:229`, `center/file/CenterFileController.ts:49-54`, cam export 경로(쿼리 기반) → 정규화 후 허용 루트 prefix 검증.
- **P2-7. 페이지네이션/검색 정합** — `CamFileController` title 필터를 페이지네이션 후 적용해 total 왜곡(`:493-506`), 코드-주석 불일치(`-2`일 vs "하루 전"), `InvoiceController.ts:194` sortBy 미검증, N+1(인보이스 목록 corp 루프 내 개별 쿼리).
- **P2-8. 빌드/의존성** — `tsc --noEmit` 타입체크 CI 추가(현재 `--transpile-only`로 우회), `@types/*`가 dependencies에 위치(→dev), `pnpm-lock.yaml` gitignore 모순, `engines`/`packageManager` 명시, body-parser 중복 등록(`index.ts:18-19` vs `46-49`), 미사용 의존성 점검.

---

## 수정 로드맵 (권장 순서)

### Phase 0 — 🔒 보안 긴급 (수 시간, 최우선)
P0-1(시크릿 로테이션+git 제거) → P0-2(평문 비번 로깅) → P0-3(시크릿 폴백 제거) → P1-13(토큰 로깅 제거). **유출 대응이라 코드 수정보다 먼저 시크릿 폐기·재발급.**

### Phase 1 — 🐛 죽은 기능 복구
P0-4·P0-5(청구·수가 컨트롤러 스키마 정합) → P0-6(roles 시드) → P0-7(모델 초기화) → P0-8(InternalServerError·param 버그). 현재 불능인 청구/수가/가입 기능 살리기.

### Phase 2 — 🛡️ 무결성·안정성
P1-1(트랜잭션) + P1-6(asyncHandler) 일괄 → P1-2(마이그레이션 체계+DROP 격리) → P1-11(토큰 무효화) → P1-12(rate-limit+helmet) → P1-14(graceful shutdown) → P1-7(파괴적 GET→POST).

### Phase 3 — 🔧 스키마·설정 정합
P1-3·P1-4·P1-5(스키마-모델 일치, 정본 SQL 1벌) → P1-15(경로 env화) → P1-16(env 오타) → P1-17·P1-18(소켓 CORS·JWT 시크릿 확인).

### Phase 4 — 🧹 품질 정리
P2-1(응답표준화) → P2-2(로깅) → P2-3(죽은코드) → P2-4~P2-8(타입/하드닝/빌드).

---

## ⚠️ 확인/결정 필요
1. **소켓↔REST JWT 시크릿 일치 여부**(P1-18) — 현재 실제로 소켓 인증이 되는지 실측 필요.
2. **청구 데이터 모델 재설계**(P0-4, P1-9) — Invoice 테이블이 "파일 기반(fileName/pdfType)"과 "금액 기반(total/delivery)" 두 성격이 섞임. 프론트 청구 미완성([docs/status/02-center.md])과 함께 도메인 모델을 확정해야 근본 수정 가능.
3. **시크릿 히스토리 제거 범위** — filter-repo로 과거 커밋까지 지울지, 로테이션만으로 갈지.
4. roles enum 고정을 **DB CHECK/enum 타입**으로 할지 앱 검증으로 할지.

> 근거 상세는 각 항목의 `파일:라인` 참조. 본 문서는 리뷰 종합이며 코드/DB는 변경하지 않음(읽기 전용 점검).
