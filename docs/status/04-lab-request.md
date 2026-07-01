# 04. 기공소 의뢰 목록 (Lab Request)

> 데스크탑 등록(웹캠 포함)은 거의 동작하나 **저장 엔드포인트가 config에 없는 하드코딩**이고,
> **목록 조회는 등록 payload와 필드명이 어긋나** 실제론 빈 화면일 가능성이 높다. **모바일은 사실상 미구현.**

## 관련 파일
- 라우트: `routes/lab/{request,requestlist}/*` (`delivery`는 메뉴엔 있으나 **폴더 없음**)
- 서비스: `app/service/request/{RequestService,RequestStore,DentalApiService}.ts`
- 모델: `app/model/lab/request/Request.ts` (**파일명-내용 불일치: 실제는 PatientInfo store, 死코드**)
- 데스크탑 뷰: `app/view/desktop/request/{RequestInfo,HospitalInfo,PatientInfo,TreatmentInfo,HeaderBar}.svelte`
- 모바일 뷰: `app/view/mobile/request/{RequestInfo,TreatmentInfo,HeaderBar}.svelte`
- 死파일: `app/view/request/HeaderBar.svelte` (어디서도 import 안 됨)

---

## ⚠️ 네이밍 혼란 (먼저 알아둘 것)
데스크탑 3스텝의 **파일명과 실제 역할이 전부 어긋남** (`RequestInfo.svelte:35-41`):
| 스텝 | 파일 | 실제 내용 |
|---|---|---|
| step1 | `HospitalInfo.svelte` | **환자 기본정보 + 웹캠 스크린샷** |
| step2 | `PatientInfo.svelte` | **치료종목/치식/가격 입력** |
| step3 | `TreatmentInfo.svelte` | **참고이미지 + 요약 + 제출** |

## 의뢰서 등록 흐름 (데스크탑)
- 진입 `routes/lab/request/+page.svelte:9-15` — `isMobile`로 분기. `+page.ts`는 거의 빈 load(`axios` unused import).
- 3단계 위저드(`RequestInfo.svelte:9-29`). `HeaderBar` import만 하고 **렌더 안 함**(`:3`) → 스텝 인디케이터 안 보임.
- **step1**(`HospitalInfo`): 환자명·납기·치과(`SearchableDropdown`)·의뢰사항 → `requestStore` 바인딩. 치과 선택 시 치료종목 자동 로드(`:395`→`RequestStore:209-218`, API 연결). 웹캠: getUserMedia(C920 가정)→A4 크롭+90도 회전 PNG(`:219-302`). "다음" `sendMessage()`는 **저장 없이** console.log+토스트+nextStep만(`:314-338`).
- **step2**(`PatientInfo`, 1226줄): 치료종목 드롭다운, 치식 상/하악 입력, 금액조정(±1000), 실시간 금액계산. 폼 add/update/remove → store 반영. "다음" `sendPatientInfo()`도 **저장 없이** nextStep(`:719-722`).
- **step3**(`TreatmentInfo`): 참고이미지, 요약. **유일하게 실제 저장 API 호출**: `submitRequestData()`(`:135-174`)가 `getCompleteRequestData()`(`RequestStore:651-696`) 모아 **하드코딩** `/api/v0/request/`로 `fetch POST`(`:142`).

### 🐛 등록 저장 불일치
- `application.dev.json`에 **`request` 엔드포인트 키 자체가 없음** → 하드코딩 우회.
- **`data.create.ok/re`는 의뢰서와 무관** — CAM 센터 플로우(`center/show/[slug]`)에서만 쓰임.
- 제출 성공 시 `nextStep()`(`:82)`이나 `maxStep=3`이라 **완료화면/리셋 없음** → 시각적으로 아무 일도 안 일어남.
- `RequestStore` 초기값에 **테스트 더미** `dentalClinic:'test'`, `screenshotFile:'test.jpg'`(`:51,54`). 식별자 이원화: mmdd-count `requestId`(`:321-356`) vs `getCompleteRequestData`의 별도 `crypto.randomUUID()`(`:689`).

## 의뢰 목록/조회 (`requestlist/+page.svelte`)
- runes 사용. `onMount`(`:132-138`)에서 치과리스트 로드+초기검색. 필터(환자명/치과/생성일/배송일/상태/탭) → `RequestService.fetchRequestListFromApi`(`:67-112`). 페이지네이션/로딩/빈상태 UI 구현됨.
- **빈 화면 가능성 (스키마 불일치)**:
  - 엔드포인트: `RequestService:50` `config...?.request` 키 없음 → `/api/v0/request` 폴백.
  - 응답 파싱 모순: 타입 `RequestApiResponse`(`:19-30`)는 `data.pagination` 구조인데 실제 파싱은 `data.requests`+`data.totalCount/...`(`:82-89`).
  - 렌더 필드: 카드가 `patientName,patientCode,receptionDate,completionDate,products[].{treatmentType,upperJaw,lowerJaw,price}` 기대(`:326-459`). 그러나 **등록 저장 형태**는 `requestInfo.{patientName,deliveryDate}` + `treatmentForms[]` (**완전히 다른 키**) → 백엔드 변환 없으면 빈/NaN. (백엔드 미확인 추정, 프론트 계약 불일치는 확정.)
- **필터 값 불일치(확정)**: 탭 status(`''/디자인/출력중/후가공/포장완료`, `:156`) vs 셀렉트(`준비중/진행중/완료/작업중/...`, `:283-291`)가 부분만 겹침, 같은 `selectedStatus` 공유로 충돌.
- **카드 액션버튼 4종 전부 미연결**(세부/주문수정/수정내역/주문취소, `:434-453`).
- `RequestService.fetchRequestDetail/updateRequestStatus`(`:121-185`)는 구현됐으나 **호출처 0건(死코드)**, 게다가 `/api/request/${id}`(v0 없음)로 목록(`/api/v0/request`)과 **버전 불일치**.

## 데스크탑 vs 모바일
- **모바일은 사실상 미구현**: `mobile/request/RequestInfo.svelte:35` step1 본문 비어있음, step2=step3 **동일 `TreatmentInfo` 렌더**(`:36,38`). 모바일 `TreatmentInfo`는 `patientInfoStore`(=`model/lab/request/Request.ts`) 구독하나 **이 store를 set하는 코드가 프로젝트 전역에 없음** → 항상 "환자 정보가 없습니다"만 표시. 입력폼/웹캠/제출 전무.
- 데이터 소스 이원화: 데스크탑=`requestStore`, 모바일=구식 `patientInfoStore`.

## 치료항목 가격 연동
- 의뢰서 단가는 `DentalApiService.getTreatmentItems(clinicId)`(`:162-197`) → `/api/v0/corp/list/{id}`의 `dentalClinicPrices[0].price_data`(**치과별 단가표**).
- `view/price/*`(NewPrice/EditPrice/BulkAdd 모달)과 `price.*` 엔드포인트는 **`/setting/pricelist` 전용**, 의뢰서 흐름과 **미연결**(grep 0건). → "단가 등록(price)"과 "의뢰서가 읽는 단가(corp/list)"가 **다른 경로**(연동 미흡, 일부 추정).
- 가격계산 로직 **중복**: `PriceCalculator`(`PatientInfo:267-342`) vs `RequestStore.calculateTotalAmount`(`:592-628`).

## 死코드/잔재
- `model/lab/request/Request.ts`(파일명-내용 불일치, set 없음), `view/request/HeaderBar.svelte`(미사용), `fetchRequestDetail/updateRequestStatus`(死), `PatientInfo`의 photoFile/FileHandler(`:385,430-435`).
- **`import { log } from 'three/tsl'`** — 3개 HeaderBar 전부(`desktop/mobile/view request/HeaderBar.svelte:2`), 미사용.
- HeaderBar step3 활성색 버그: step3 표시인데 `class:...={currentStep == 2}`(`*/HeaderBar.svelte:76-77`).
- `SliderMenu.svelte:83,99` "의뢰 목록"·"커스텀 확인" 둘 다 `href="requestlist"` 중복. `/lab/delivery`는 `UserRole.ts:54`/PermissionService 등록됐으나 **라우트 폴더 없음**.

## 품질
- console.log 대량(HospitalInfo 웹캠/키보드, `TreatmentInfo:51-75`, requestlist `:102,126,213,230,257` 등), **화면 노출 디버그 UI**(`HospitalInfo:466-470`), **테스트 단축키 F1/F2 잔존**(`HospitalInfo:114-132`).
- any 남발(`+page.ts:11`, requestlist `$state<any[]>`(`:53`), 카드 `(p:any)`), 타입 선언≠실제 응답.

## ✅ 할 일
**P0**: ① 등록 저장 엔드포인트 config 이관(`request` 키 추가, `TreatmentInfo:142` 하드코딩 제거)+`data.create.ok/re` 관계 확정 ② **등록 payload↔목록 필드 데이터 계약 통일**(`RequestStore:651-696` ↔ `requestlist:326-459`) ③ 응답 파싱을 실제 스키마/타입과 일치(`RequestService:82-94`) ④ 모바일 등록 재구현(`mobile/request/*`, `patientInfoStore`→`requestStore`) ⑤ `/lab/delivery` 신설 또는 메뉴/권한 제거.
**P1**: ⑥ 카드 액션버튼 연결(死코드 `fetchRequestDetail/updateRequestStatus` 활용, 경로 v0 통일) ⑦ 탭/셀렉트 status 표준화 ⑧ 등록 완료 처리(리셋/완료화면) ⑨ price↔corp/list 단가 연동 검증.
**P2**: ⑩ HeaderBar `three/tsl` import 제거+step3 버그 수정 ⑪ 데스크탑 HeaderBar 렌더 또는 import 제거 ⑫ 死파일/死코드 삭제 ⑬ console.log/디버그UI/F1·F2 제거 ⑭ 더미값 제거(`RequestStore:51,54`)·any 정비·가격계산 단일화 ⑮ 컴포넌트 네이밍 정리(Hospital/Patient/Treatment↔실제 역할).
