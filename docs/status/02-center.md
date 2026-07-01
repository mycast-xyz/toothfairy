# 02. 기공센터 (Center)

> STL 출력물 검수와 거래처 관리는 동작하지만, **청구서(invoice) 기능은 절반 이상이 스텁/하드코딩/미연결**이다.
> 주의: 청구서는 경로상 `center`가 아니라 **`setting/invoice`** 아래에 있다.

## 구성 (3갈래로 흩어짐)
- **(A) 출력물(STL) 관리** — `routes/center/print`, `routes/center/show/[slug]` → **동작**
- **(B) 청구서(invoice)** — `routes/setting/invoice`, `routes/setting/invoice/[slug]` → **대부분 미완**
- **(C) 거래처** — `routes/setting/company` → 목록/추가/수정 동작, 삭제·검색·탭 미구현

## 관련 파일
- 서비스: `app/service/invoice/{InvoiceCommonService,InvoiceViewStore}.ts`
- 뷰: `app/view/invoice/{InvoiceView,DentistryInvoiceList,LabInvoiceList,InvoicePdfRenderer}.svelte`, `app/view/invoice/pdf/{Cap,Custom,Partial}InvoicePdf.svelte`, `app/view/company/*`
- 모델: `app/model/company/CenterCompany.ts`, `app/model/invoice/InvoicePageType.ts`
- PDF 중계: `routes/api/pdf/render/+server.ts`

---

## 동작하는 것
- `/center/print` 월별 리스트 + 탭/상태/회사명 필터 + 쿠키 검색조건 저장.
  데이터: `file.check`(`/api/v0/center/file/chk`) 연결(`+page.svelte:158-162`).
- `/center/show/[slug]` STL 뷰어 + 파일 매칭 + 정상/리메이크 유닛 수정.
  데이터: `file.item` 조회(`+page.ts:23-35`), 유닛 수정은 `data.create.ok/re` POST(`+page.svelte:466,495`). 연결 정상.
- `/setting/company` 거래처 목록/추가/수정 (`CompanyForm` → `company.create`/`update`, JWT 포함).
- PDF 렌더 중계 서버 라우트(`/api/pdf/render`, 재시도/에러처리 완성도 높음).

## 미완성 / 깨진 것
1. **치과 청구서 탭이 빈 껍데기** — `DentistryInvoiceList.svelte:44-84`의 **행 본문(`<tr>`) 전체가 주석 처리** → 헤더만 보이고 데이터 0. 주석 내 링크는 **존재하지 않는** `/center/invoice/${id}`(`:54,61,69,76`). (`routes/center/`에 invoice 라우트 없음.)
2. **invoice 엔드포인트 하드코딩 + config 불일치**:
   - `setting/invoice/+page.ts:22` `/api/v0/invoice/center/list` ↔ config `invoice.list=/api/v0/center/invoice/list` (**경로 순서 다름**).
   - `:35` `/api/v0/invoice/dental/list` → config에 **대응 없음**.
   - `[slug]/+page.ts:25` `/api/v0/invoice/corp` ↔ config `invoice.corp=/api/v0/center/invoice/corp` (**불일치**).
   - 실사용 config는 `invoice.save`(`InvoiceViewStore.ts:179-181`)뿐 → 나머지 invoice config 블록은 **죽은 설정**.
3. **종류별 단가 계산 미구현** — `InvoiceViewStore.ts:111`이 종류 무관하게 항상 `initialize('cap')`(주석 "모든 타입이 cap 방식으로 통일됨"). 각 PDF도 `initialize('cap')`. `calculatePriceTotals(priceType)`/`getInvoicePrices(...)`의 `priceType` 인자 **미사용**(`:144,151`). `CenterCompany.prices{cap/partial/allonfour/custom}` 구조 정의돼 있으나 `mapCorpInfo`는 `print_type` 단일값만 사용(`:259-264`) → 모델-서비스 불일치.
4. **PDF는 Playwright 서버 중계 방식** (jsPDF 아님): `InvoicePdfRenderer`가 DOM `innerHTML` 추출→Tailwind CDN 삽입→`POST /api/pdf/render`→axios로 Playwright 서버 `/api/v0/pdf/render` 중계. **그 서버는 이 레포에 없음**(별도/미배포 추정). 기본 포트 `localhost:3000`(`+server.ts:60`)이 **백엔드 REST와 충돌**(README는 3001 권장). 약 4.5초 setTimeout 대기 의존(`:336-360`). 메타값 `/pdfs/`경로·`'current_user'`는 TODO 스텁(`:183,203`).
5. **거래처 미구현**: 삭제 버튼 onclick 없음(`setting/company/+page.svelte:329`), 탭 전부 `disabled`(`:208-225`), 검색 UI 주석처리(`:231-244`), 죽은 `handleSubmit`(`:130-133`).
6. **`LabInvoiceList`** 데이터 가정 취약 — `item.invoice.cap.normal` 직접 접근(`:73,80,88,96`), 백엔드가 보장 안 하면 런타임 에러.
7. **`DELIVERY_FEE_STANDARDS.reverse()` 부작용** — 모듈 상수 배열을 제자리 변형(`InvoiceCommonService.ts:323`) → 재생성 시 순서 누적 반전.

## 청구서 종류 (`InvoicePageType.ts:4-10`)
`CAP / CUSTOM / PARTIAL / ALLONFOUR / DENTISTRY` 5종. URL `?item=`으로 분기.
화면 차이: CAP(배송기준O,환자명X), CUSTOM(둘다X), PARTIAL/ALLONFOUR(환자명O, ALLONFOUR은 PartialInvoicePdf 재사용).
계산: `InvoiceCommonService` — `calculateUnitTotals/PriceTotals`, 배송비 `calculateDeliveryInvoice:212-231`, 총액 `calculateTotalPrice:233`.

## 품질 문제
- **계층 위반**: `center/print/+page.svelte:224-346`에 `getFileInfo`/`normalizeString`/`isSenderMatch` 복붙 — `InvoiceCommonService:179-428`와 **중복**. 쿠키 유틸도 print/show 각각 복붙. `center/show`가 `fetch` 직접 호출(service 미경유).
- **console.log 폭증**: `center/show/[slug]`(65), `InvoicePdfRenderer`(56), `CompanyForm`(55), `InvoiceViewStore`(22).
- **any 남발**: 전 화면 `data:any`, `InvoiceCommonService` `data/calendarData:any`.
- **죽은 코드/파일**: `InvoiceCommonService:431-500` 레거시 함수 export(열화된 `getFileInfo` 포함), `center/print/test.html`, `setting/invoice/test.json`, `model/company/TestDentistry.json`, `stlviewer/{backup,test}.svelte`.
- **명칭 혼재**: allonfour 표시명 "올온포"/"올인원 인보이스"/"올인원 견적서", "청구서" vs "견적서"(`[slug]:16-34`).

## ✅ 할 일
**P0**: ① 치과탭 주석 해제+링크 경로 수정(`DentistryInvoiceList:44-84`) ② invoice 엔드포인트 config 정합화 ③ 거래처 삭제/검색/탭 구현.
**P1**: ④ 종류별 단가 계산 구현(`InvoiceViewStore:111`, PDF `initialize`, `priceType` 인자 활용) ⑤ PDF 메타 실값 연결 + Playwright 포트(3001) 분리 ⑥ `DELIVERY_FEE_STANDARDS.reverse()` 복사본 사용(`:323`).
**P2**: ⑦ 중복 로직/쿠키 유틸 단일화 ⑧ 레거시 export 정리 ⑨ console.log 제거 ⑩ 테스트/백업 파일 삭제 ⑪ 명칭 일관화 ⑫ any 축소.
