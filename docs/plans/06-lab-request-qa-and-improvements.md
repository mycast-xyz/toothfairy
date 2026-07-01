# 기획안 06 — 기공소 의뢰목록(Lab Request) 사용자 QA & 개선 로드맵

> 작성 2026-07-01 · 상태: **QA + 기획(코드 미변경)**
> 방법: 라이브 브라우저 QA(로컬 Chrome, `localhost:5173`, 백엔드 `:3000`·DB) + 코드 QA 3종(등록 흐름 / 목록·조회 / 모바일·死코드·품질) + 백엔드 계약/DB 실측.
> 대상: `routes/lab/{request,requestlist}/*`, `service/request/{RequestStore,RequestService,DentalApiService}.ts`, `view/desktop/request/*`, `view/mobile/request/*`.
> 참고: 기술 인벤토리 [`docs/status/04-lab-request.md`](../status/04-lab-request.md), QA 형식 [`05-cam-qa-and-improvements.md`](./05-cam-qa-and-improvements.md).

---

## 0. 요약 — 사용자가 가장 크게 막히는 곳

- **입력이 유실된다** — 등록 3스텝 중 Step1·Step2 입력은 **서버/로컬 저장 없이 메모리(store)에만** 담긴다. 새로고침·탭 닫기 시 전부 소실. 그런데 Step1은 **"저장되었습니다" 거짓 토스트**를 띄운다.
- **모바일 등록이 전면 불가** — 모바일 화면은 입력 UI가 비어 있고, 다음 버튼도 없고, store에 값을 넣는 코드도 없다(껍데기).
- **웹캠이 필수라 실패하면 Step1에서 막힌다** — 스크린샷(screenshotDataUrl)이 필수 검증이고, 웹캠 실패 시 대체 업로드 경로가 없다.
- **조회 후 관리가 안 된다** — 목록 카드의 세부사항·주문수정·수정내역·주문취소 버튼이 전부 死버튼(핸들러 없음).
- **목록 일부 필드가 빈칸** — 접수일·완성일·환자번호가 비어 표시(백엔드/DB에 해당 필드 없음).
- **깨진 메뉴** — `/lab/delivery`는 메뉴·권한엔 있으나 라우트 폴더가 없어 404.

### 라이브에서 확인된 정상 동작
- **의뢰 목록은 데이터로 렌더됨**(빈 화면 아님, 3건): 환자명·치과·치료유형(INLAY/Metal Crown)·치식·품목가격·합계금액(992,000/248,000원) 정상. 페이지네이션(총 3개/1페이지), 로딩·빈상태 UI 존재.
- 데스크탑 3스텝 구조 정상(Hospital→Patient→Treatment), 치과 선택 시 치료종목/단가 자동 로드.
- ※ 목록이 뜨는 것은 **백엔드가 등록 payload(중첩 requestInfo + treatmentForms)를 평탄한 조회형(products 등)으로 상당부분 변환**하기 때문. 다만 접수/완성일·환자번호는 원본 DB(`request_form`)에 컬럼이 없어 비어 나옴(실측).

---

## 🔴 막힘 (P0 — 진행 불가/데이터 유실)

| # | 위치 | 사용자 증상 | 파일:라인 | 근본 원인 |
|---|---|---|---|---|
| L1 | 등록 Step1·2 | 입력 후 새로고침하면 전부 소실. 게다가 Step1은 "저장되었습니다" 토스트로 저장된 줄 오인 | `HospitalInfo.svelte:314-338`(nextStep만+거짓토스트), `PatientInfo.svelte:719-722` | 중간 저장(서버/localStorage) 부재. 서버 POST는 Step3 제출 1회뿐(`TreatmentInfo.svelte:135-174`) |
| L2 | 모바일 등록 | 모바일에서 의뢰 등록 전면 불가(빈 화면, 진행 버튼 없음) | `mobile/request/RequestInfo.svelte:35`(step1 빈 분기),`:36/38`(step2=step3 동일), `mobile/request/TreatmentInfo.svelte`(버튼 0), `model/lab/request/Request.ts`(patientInfoStore setter 호출 전무) | 데스크탑=`requestStore` vs 모바일=`patientInfoStore` **데이터 소스 이원화**, 모바일은 writer·입력 UI·저장 로직 전무 |
| L3 | 등록 Step1 웹캠 | C920 없거나 권한 거부 시 스크린샷 못 찍어 Step1 통과 불가 | `HospitalInfo.svelte:147-187`(실패 시 메시지만), 검증 `RequestStore.ts:447`(screenshotDataUrl 필수) | 스크린샷 필수 + 대체 파일업로드 경로 없음 |
| L4 | 목록 카드 액션 | 세부사항·주문수정·수정내역·주문취소 눌러도 무반응 → 조회 후 관리 불가 | `requestlist/+page.svelte:434,439,444,449` | onclick 핸들러 미연결. `RequestService.fetchRequestDetail/updateRequestStatus`도 死코드(호출처 0) |
| L5 | 사이드바 배송 목록 | `/lab/delivery` 클릭 시 404 | `UserRole.ts` MENU_PERMISSIONS 등록 vs `routes/lab/`에 폴더 없음 | 라우트 미구현(메뉴/권한만 등록) |
| L6 | 목록 카드(일부) | 접수일·완성일·환자번호 전부 빈칸(실측) | 카드가 `receptionDate/completionDate/patientCode` 기대 vs DB `request_form`엔 `delivery_date`만 | 조회 스키마에 해당 필드 부재(백엔드/DB 보강 필요) |

---

## 🟡 혼란 (P1)

| # | 위치 | 사용자 증상 | 파일:라인 | 근본 원인 |
|---|---|---|---|---|
| M1 | 등록 전 화면 | 지금 몇 단계/총 몇 단계인지 안 보임 | `desktop/request/RequestInfo.svelte:3`(import만) | HeaderBar(스텝 인디케이터)를 import만 하고 렌더 안 함 |
| M2 | 등록 제출 후 | 완료 눌러 성공해도 화면 그대로(완료화면·리셋 없음) → "제출됐나?" 혼란 + 재클릭 시 중복 POST | `TreatmentInfo.svelte:82`(nextStep이 maxStep=3에서 no-op) | 완료 스텝·`resetRequestInfo` 미구현, 중복 방지 없음 |
| M3 | 목록 상태 필터 | 탭(디자인/출력중/후가공/포장완료)과 셀렉트(준비중/진행중/완료/…)가 부분만 겹쳐 필터·강조 어긋남. 셀렉트는 검색버튼 눌러야 반영 | `requestlist/+page.svelte:156` ↔ `:283-291`(공유 `selectedStatus`) | 상태 값 집합 이원화 + 단일 변수 공유 + 셀렉트 onchange 부재 |
| M4 | 목록 상태 표시 | 카드 상태 "준비중"인데 탭엔 없어 탭으로 못 찾음 | 상태 값 표준 부재 | 등록/조회/탭 상태 값 불일치 |
| M5 | 목록 페이지네이션 | 총건수·페이지수가 0/1로 오표기될 소지 | `RequestService.ts:19-30`(타입 `data.pagination`) ↔ `:82-93`(실제 `data.totalCount` 평면·`success`) | 타입 선언과 파싱이 다른 스키마 가정(라이브는 동작하나 취약) |
| M6 | 엔드포인트 | config에 `request` 키 없어 하드코딩 폴백, detail/status는 `/api/request`(v0 누락) | `RequestService.ts:50,130,162`, `TreatmentInfo.svelte:142`, config 미등록 | 엔드포인트 버전·config 규칙 불일치 |
| M7 | 사이드바 통계 | "매출 통계"·"재료 통계" 클릭 시 엉뚱한 화면(사용자/권한 관리로) | `UserRole.ts:95`↔`:125`, `:102`↔`:132` (path 중복) | MENU_PERMISSIONS에 동일 path 중복 |
| M8 | 등록 웹캠 패널 | 웹캠 위 검은 디버그 박스(`showVideo/hasScreenshot`) 상시 노출, "웹캠 소스 명" 플레이스홀더 | `HospitalInfo.svelte:465-470,507` | 개발용 디버그 UI·미완성 라벨 미제거 |
| M9 | 등록 파일명 필드 | "스크린샷 저장" 파일명 타이핑해도 반영 안 됨(死필드) | `HospitalInfo.svelte:408-413`(`$derived`에 bind, oninput 없음) | 읽기전용 `$derived`에 `bind:value` |
| M10 | 유지보수 | 파일명↔역할 불일치(Hospital=환자기본, Patient=치료/치식, Treatment=제출), 가격계산 이중구현 | `RequestInfo.svelte:35-41`, `RequestStore.ts:592` vs `PatientInfo.svelte:315`(치식 카운팅 상이) | 네이밍·로직 중복 → 같은 데이터 다른 금액 위험 |

---

## 🟢 불편 (P2)

- **死파일/死코드**: `model/lab/request/Request.ts`(파일명-내용 불일치·死 store), `view/request/HeaderBar.svelte`(미import), `view/menu/SliderMenu.svelte`(死, script 주석·`requestlist` href 중복), `RequestService.fetchRequestDetail/updateRequestStatus`(死), `PatientInfo` photoFile 타입(File)≠실제(dataUrl 문자열).
- **`import { log } from 'three/tsl'`** — desktop/mobile/view request HeaderBar 3곳(미사용, three 전체 유입 위험) + `console.log(currentStep)` 상시.
- **테스트 잔재**: F1/F2 단축키(`HospitalInfo.svelte:114-132`), 더미값(`RequestStore.ts:51,54` `dentalClinic:'test'`·`screenshotFile:'test.jpg'`), 식별자 이원화(mmdd-count vs randomUUID).
- **참고이미지 유실**: File 객체가 `JSON.stringify`에서 `{}`로 직렬화 → 실제 이미지 바이너리 미전송(dataUrl만).
- **모바일 페이지네이션 가드 누락**: 마지막 페이지에서도 "다음" 눌림(`requestlist/+page.svelte:485-493`, 데스크톱 `:548`엔 가드 있음).
- **console.log 대량 / any 남발**: 의뢰 섹터 `TreatmentInfo`/`HospitalInfo` 각 26건, 전역 any 다수.

## 🔴 보안 (별개지만 심각 — 발견 기록)
- **`hooks.server.ts`가 Access/Refresh 토큰 디코딩 값을 콘솔 출력**(`:57-58,239,260` "테스트 로그"). 의뢰 섹터 밖이지만 이번 QA 중 재확인 — 프로덕션 토큰 노출.

---

## 수정 로드맵 (사용자 영향 우선)

### Phase A — 🔴 막힘 해소
1. **등록 유실 방지**(L1) — Step1/2 "다음" 시 최소 localStorage(또는 서버 임시저장)로 보존 + 복원. Step1의 거짓 "저장되었습니다" 토스트 → "다음 단계로 이동합니다" 등 정직한 문구. (근본은 단계별 서버 저장 또는 최종 제출 전 draft.)
2. **모바일 등록 재구현 또는 안내**(L2) — 데스크탑 `requestStore` 기반으로 모바일 입력 UI 재작성(패널티 크면, 우선 "PC에서 등록해 주세요" 명시적 차단). `patientInfoStore` 死 경로 제거.
3. **웹캠 실패 대체**(L3) — 스크린샷 필수 완화 또는 파일 업로드 대체 경로 추가.
4. **카드 액션 연결**(L4) — 세부/수정/취소를 실제 동작에 연결(`fetchRequestDetail/updateRequestStatus` v0 통일 후 활용) 또는 미구현이면 숨김.
5. **`/lab/delivery` 처리**(L5) — 라우트 신설 or 메뉴/권한 제거.
6. **목록 결측 필드**(L6) — 접수일/완성일/환자번호를 백엔드/DB에 보강(또는 카드에서 `deliveryDate` 등 실재 필드로 표기 정정). 백엔드 계약 확정 필요(O-1).

### Phase B — 🟡 혼란 제거
7. 스텝 인디케이터 렌더(M1), 제출 완료화면·리셋·중복방지(M2).
8. 상태 값 표준화(M3/M4) — 탭·셀렉트·등록·조회 status 단일 집합 + 셀렉트 즉시반영.
9. 응답 파싱을 실제 스키마와 일치(M5), 엔드포인트 config 이관·v0 통일(M6).
10. 메뉴 path 중복 수정(M7), 디버그 UI·死필드·파일명·가격계산 정리(M8/M9/M10).

### Phase C — 🟢 정리
11. 死파일/死코드 삭제, `three/tsl` import 제거, F1/F2·더미값·console.log 정리, 참고이미지 전송 방식(FormData) 개선, 모바일 페이지네이션 가드.

### 보안(우선)
12. `hooks.server.ts` 토큰 콘솔 로깅 제거(별도 백엔드/프론트 정리와 함께).

---

## ⚠️ 오픈 이슈 / 결정 필요

- **O-1. 목록 조회 스키마 확정** — 접수일/완성일/환자번호를 백엔드가 제공하도록 `request_form` 스키마·응답을 보강할지, 프론트 카드를 실재 필드(`deliveryDate` 등)로 정정할지.
- **O-2. 모바일 등록 방향** — 재구현 vs "PC 전용" 명시 차단.
- **O-3. 웹캠 필수 여부** — 스크린샷 필수 유지 + 업로드 대체 vs 선택화.
- **O-4. `/lab/delivery`** — 배송 목록 기능 신설 여부.
- **O-5. 상태(status) 값 표준** — 디자인/출력중/후가공/포장완료 vs 준비중/진행중/완료 중 정본 확정.

> 본 문서는 QA·우선순위화 단계이며 코드는 미변경. 착수 시 O-1(조회 스키마)·O-5(상태 표준)을 백엔드와 먼저 합의할 것.
