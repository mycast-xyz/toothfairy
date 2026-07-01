# 기획안 03 — 기공센터(Center) 사용자 QA & 개선 로드맵

> 작성 2026-07-01 · 방법: 팀 QA 에이전트 2개(기능 관점 + UX/디자인 관점)로 센터 3영역(STL 출력물 / 청구서 / 거래처)을 사용자 입장에서 정밀 검수.
> 베이스라인(코드 검수): [`docs/status/02-center.md`](../status/02-center.md).
> 심각도: **🔴 막힘**(목적 달성 불가) > **🟡 혼란**(오해·불신) > **🟢 불편**(성가심·비효율) + **🎨 UX/디자인**(일관성·다크모드·반응형·접근성).

---

## 0. 요약 — 사용자가 가장 크게 막히는 곳

1. **센터 메뉴 2개(청구서·거래처)가 클릭하면 404** — 메뉴 링크가 `/center/invoice`·`/center/company`인데 실제 페이지는 `/setting/invoice`·`/setting/company`에만 존재. 센터 핵심 3영역 중 2개 진입 자체가 막힘.
2. **치과 청구서 탭이 영구 빈 표** — 행 렌더링이 통째로 주석 처리 + 깨진 링크.
3. **청구서 데이터가 안 뜨거나 흰 화면 크래시** — 백엔드 주소 하드코딩(:3000) + 로드 실패 시 `not iterable` 런타임 에러.
4. **죽은 버튼들** — 거래처 삭제·폼 취소·정렬 헤더·"⋯" 메뉴가 눌러도 무반응.
5. **저장해도 화면이 안 바뀜** — STL 유닛 "추가 필요" 하드코딩, 비-CAP 청구서 금액이 CAP 단가로 계산(잘못된 금액 노출).

---

## 🔴 막힘 (P0 — 즉시)

| # | 화면 | 증상 | 근거 |
|---|---|---|---|
| B1 | 사이드바 "기공센터" | 청구서·거래처 메뉴 클릭 → 없는 경로(`/center/invoice`,`/center/company`)로 404 | `view/menu/SliderMenu.svelte:168,184` vs 실제 `routes/setting/invoice`,`routes/setting/company` |
| B2 | 청구서 > 치과 탭 | 데이터 있어도 **0행**(헤더만), 안내도 없음 | `DentistryInvoiceList.svelte:44-84`(`<tr>` 전체 주석), 링크 `/center/invoice/${id}`(없음) |
| B3 | 청구서 목록/상세 | 백엔드가 :3000 아니면 전부 빈 화면(하드코딩+엔드포인트 불일치) | `setting/invoice/+page.ts:8`, `[slug]/+page.ts:7` |
| B4 | 청구서 목록 | 로드 실패가 `catch(console.log)`로 삼켜짐 → `data.lab/dental` undefined → **not iterable 크래시(흰 화면)** | `+page.ts:30-32,43-45`, `LabInvoiceList.svelte:53`, `DentistryInvoiceList.svelte:44` |
| B5 | 거래처 목록 | **삭제 버튼 무반응**(onclick 없음) | `setting/company/+page.svelte:329-334` |
| B6 | 거래처 폼 | **취소 버튼 무반응** + 취소인데 북마크 아이콘 | `CompanyForm.svelte:652-658` |
| B7 | STL 상세 | 로드 실패 시 "**파일 : NaN개**"·빈값 렌더, 에러 안내 없음 | `center/show/[slug]/+page.svelte:581,590-591`, `+page.ts:65-81` |
| B8 | 청구서 PDF | 외부 Playwright 서버 부재로 **~13초 대기 후 실패**(4.5s 하드대기 + 3s×3 재시도) | `InvoicePdfRenderer.svelte:336-360,250-251` |

## 🟡 혼란 (P1)

| # | 화면 | 증상 | 근거 |
|---|---|---|---|
| C1 | STL 상세 | 유닛 박스가 저장해도 영원히 "**추가 필요**"(하드코딩, 미바인딩) | `show/[slug]/+page.svelte:603` |
| C2 | 청구서 상세 | **비-CAP 금액을 CAP 단가로 계산** → 잘못된 청구금액이 실데이터처럼 표시 | `InvoiceViewStore.ts:111`(`initialize('cap')`) |
| C3 | 각 리스트 헤더 | **가짜 정렬 UI** — cursor-pointer+화살표인데 클릭 무동작 | `center/print:546-621`, `company:251-274`, `DentistryInvoiceList:9-40` |
| C4 | STL/청구서 리스트 | 필터 결과 0건이면 **백지**(안내 없음, 전체 0건일 때만 안내) | `center/print:646` vs `:660` |
| C5 | 전반 | **명칭 혼재**: "올온포"↔"올인원", "청구서"↔"견적서"; 상세 헤더에 청구서 종류 미표시(미사용 `modalTitle` 死코드) | `[slug]:14-35`, `InvoiceView.svelte:83-107` |
| C6 | 청구서 상세 | 날짜 미지정 시 더미 "**2024-01**"이 실값처럼 노출 | `InvoiceView.svelte:185-189,207` |
| C7 | 청구서 검색 | 기공소 탭에서 검색하면 탭이 **치과로 리셋**(전체 리로드) | `setting/invoice/+page.svelte:14,41-43` |
| C8 | STL 상세 | 유닛 입력이 `type=text`+검증 없음, 어포던스 약함(border-none) | `show:617-622,645-650` |
| C9 | STL 3D 뷰어 | **조작 반전**(좌클릭=이동/우클릭=회전, 관례 반대) + 조작 안내·초기화 버튼 없음 | `PrintOutPutViewer.svelte:221-250` |
| C10 | STL 뷰어 | 큰 STL 로드 중 **피드백 없음**(진행률 console만) → "멈췄나?" | `PrintOutPutViewer.svelte:88-90` |
| C11 | 청구서 상세 | 헤더는 "청구서 저장 및 PDF"인데 **저장 버튼 없음**(PDF 다운로드의 부수효과로만 저장) | `InvoiceView.svelte:119,122-131` |

## 🟢 불편 (P2)

- **거래처 검색/필터/페이지네이션 전무** — 검색 주석처리, 탭 전부 disabled, 전량 렌더 → 많아지면 스크롤로만 탐색 (`company:208-245,306`)
- **진입마다 성공 토스트**("총 N개 불러왔습니다") 반복 (`company:49`)
- **중복 클릭 방지 없음** — 거래처 저장·STL 수정 버튼 연타 시 중복 등록/POST (`CompanyForm:659-670`, `show:625-660`)
- **콘솔 로그 과다 + PII** — CompanyForm이 사업자번호·이메일·전화 전량 콘솔 출력 (`CompanyForm:99-151`)
- **취약한 데이터 접근** — `item.invoice.cap.normal`(`LabInvoiceList:73-96`), `corpInfo?.totalNormalPrice.toLocaleString()`(`InvoiceView:350,356`) → 조건부 크래시
- **죽은 버튼/코드** — "⋯" 버튼(`center/print:776`), `company handleSubmit`(`:130-133`)
- **PDF 모달 취소해도 뒤늦게 토스트** — abort 미처리 (`InvoiceView:423-429`)

## 🎨 UX / 디자인

- **다크모드 반쪽** — 표는 대응, 탭바·필터·상태버튼·폼·청구서 본문·PDF 모달은 `dark:` 누락 → 다크 시 "흰 섬". 종류 배지도 다크에서 색 구분 소멸 (`print:401,464,489-516`, `CompanyForm`, `InvoiceView:177-266`, `PageHeaderBar`)
- **반응형 붕괴** — 전 화면 `ml-64` 고정 + 출력물/청구서 테이블 `overflow-x` 없음 → 태블릿/좁은창에서 잘림, 모바일 사실상 사용 불가 (`print:390`, `invoice:62`, `InvoiceView:115`)
- **색상 혼용** — 주 액션이 violet/blue 혼재, 한 화면에 gray/blue/violet 버튼 (`company:173,181,190`, `DentalCompanyForm`)
- **접근성** — 클릭 행이 `<tr onclick>`/`<div onclick>`(키보드·스크린리더 불가), 체크박스 label/for 없음, canvas aria 없음, 아이콘버튼 일부 aria-label 누락 (`print:662,776`, `show:696-764`)
- **폼 UX** — 필수(`*`) 표시 없음, 필드별 검증 즉시성 제각각(회사명은 즉시/전화·이메일은 제출 후) (`CompanyForm:355-533`)
- **탭 비활성 이유 미표시** — 데이터 없을 때 탭 전체 disabled인데 왜인지 안내 없음 (`print:405-461`)

---

## 수정 로드맵 (사용자 영향 우선)

### Phase A — 🔴 막힘 해소 (진입/데이터/죽은버튼)
1. **센터 메뉴 링크 정합**(B1) — `SliderMenu` href를 실제 경로로, 또는 라우트를 `/center/*`로 이전(IA 일치). ※ 정보구조 결정 필요(아래 오픈이슈).
2. **치과 청구서 탭 복구**(B2) — `DentistryInvoiceList` 행 주석 해제 + 링크 `/setting/invoice/...`로 교정.
3. **청구서 엔드포인트/포트 config화**(B3) — 하드코딩 제거, `ConfigService`+config 엔드포인트로. (백엔드 [`02-backend-review`] 및 프론트 [`01-...`] 하드코딩 정리와 연계)
4. **로드 실패 폴백**(B4, B7) — `data.lab/dental = []` 폴백 + 에러 토스트, STL 상세 실패 전용 화면.
5. **죽은 버튼 연결**(B5, B6) — 거래처 삭제(확인 모달+API+토스트), 폼 취소(목록복귀). 미구현이면 숨김.
6. **PDF 대기 개선**(B8) — 서버 헬스체크 선반영, 하드 대기 단축, 실패 즉시 안내.

### Phase B — 🟡 혼란 제거 (정합/신뢰)
7. **유닛 박스 실값 바인딩 + 저장 후 갱신**(C1, C8) — 하드코딩 "추가 필요" 제거, `type=number`/검증.
8. **종류별 단가 계산 구현**(C2) — `InvoiceViewStore` `initialize`에 실제 pageType 전달(백엔드 단가 데이터 연계). ※ [`docs/status/02-center.md`] P1과 동일.
9. **정렬 실제 구현 또는 UI 제거**(C3), **필터 빈결과 안내**(C4).
10. **용어 단일화**(C5) — 올온포/올인원, 청구서/견적서 상수 통일 + 상세 헤더에 종류 표시, 死 `modalTitle` 제거.
11. **더미 날짜 제거**(C6, 현재월 폴백), **검색 후 탭 유지**(C7).
12. **3D 뷰어**(C9, C10) — 좌클릭=회전/우클릭=이동으로 관례화 + 조작 안내·시점 초기화 버튼 + 로딩 오버레이(%).
13. **명시적 저장 액션**(C11) 또는 문구 정정.

### Phase C — 🎨 UX/디자인
14. **다크모드 전면 대응**(탭/필터/폼/청구서/모달/배지 `dark:` 보강).
15. **반응형**(`md:ml-64` 조건화 + 사이드바 모바일 접힘 + 테이블 `overflow-x-auto`).
16. **색상 팔레트 규칙**(주=violet/보조=gray/위험=red, focus ring 통일).
17. **접근성**(클릭요소 button/role+tabindex+키핸들러, label/for, canvas aria).
18. **폼 UX**(필수 `*`, 검증 정책 일관화, 첫 에러로 스크롤·포커스).

### Phase D — 🟢 불편/정리
19. 거래처 검색/필터/페이지네이션 활성화.
20. 중복 클릭 방지(제출 중 disabled+스피너), 진입 토스트 조건화.
21. 콘솔 로그·PII 제거/마스킹, 취약 데이터 접근 옵셔널 체이닝, PDF 취소 AbortController, 죽은 코드 제거.

---

## ⚠️ 오픈 이슈 / 결정 필요
1. **정보구조: 청구서·거래처를 "기공센터" 하위(`/center/*`)로 옮길지, "설정(`/setting/*`)"에 두고 메뉴만 맞출지.** — B1 수정 방향을 가름.
2. **청구서의 1차 목적**(PDF 발행/보관 vs 금액 정산) — 종류별 단가(C2)·저장 액션(C11)·백엔드 Invoice 모델(P0-4) 방향과 함께 확정. (백엔드는 옵션 A=파일기반으로 결정됨 → 프론트도 파일/PDF 중심 UX로 정렬 권장.)
3. **PDF 렌더 서버**(Playwright) 배포/포트 확정 — 없으면 PDF 기능 전체가 미동작(B8).

> 근거는 각 항목 `파일:라인` 참조. 두 QA 리포트(기능/UX) 원문은 세션 기록에 있음. 본 문서는 종합·우선순위화이며 코드는 아직 미변경(QA+기획 단계).
