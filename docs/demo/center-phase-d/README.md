# 센터 Phase D — 크래시·데이터 무결성 결함 수정 + 검증

> 2026-07-01 · 로컬 Chrome(Browser 1) · ToothFairy `localhost:5173` + 백엔드 `:3000` + PostgreSQL
> 로그인: 테스트 admin `qa_admin`. **6월(2026-06) 실데이터**로 검증.
> 대상: [`docs/plans/03-center-qa-and-improvements.md`](../../plans/03-center-qa-and-improvements.md) Phase D(19~21) 중 사용자 영향이 큰 결함 항목.

## 수정 항목 (전 항목 브라우저 검증 통과)

| # | 결함 | 원인 | 수정 | 검증 |
|---|---|---|---|---|
| ① | **청구서 상세 소계 크래시** | `{$corpInfo?.totalNormalPrice.toLocaleString()}` — corpInfo는 옵셔널체인이나 `totalNormalPrice`가 undefined면 `.toLocaleString()` 크래시(흰 화면) | 소계 4개 셀을 `($corpInfo?.totalNormalPrice ?? 0).toLocaleString()`/`?? 0`로 방어 (`InvoiceView.svelte`) | 캡 청구서 상세 소계 정상 렌더(122,000원) |
| ② | **청구서 리스트 크래시** | `item.invoice.cap.normal` 등 무방비 접근 — `invoice`/`cap` 없으면 리스트 전체 크래시 | 4종(cap/partial/custom/allonfour)×정상·리메이크 전부 `item.invoice?.cap?.normal ?? 0` 옵셔널 체이닝 (`LabInvoiceList.svelte`, `DentistryInvoiceList.svelte`) | 기공소/치과 청구서 탭 정상 렌더(출력·리메이크 값 표시, 빈 탭 안내) |
| ③ | **거래처 폼 PII 콘솔 노출 + 중복 제출** | `handleSubmit`가 사업자번호·이메일·전화·주소·수가 전량 `console.log`; 저장 버튼 연타 시 중복 POST | PII 디버그 로그 ~40건 제거(에러 로그는 값 없이 유지), `isSubmitting` 가드 + try/finally, 버튼 `disabled` + "저장 중..." 스피너 (`CompanyForm.svelte`) | 폼 정상 렌더, 빈 폼 제출 시 검증 토스트 5종 정상(거래처 생성 안 됨) — 가드가 검증 흐름을 깨지 않음 |
| ④ | **PDF 취소 후 늦은 에러 토스트** | 취소해도 진행 중 렌더러의 결과 콜백이 ~13초 뒤 도착해 "서버 연결 불가" 에러 토스트 노출 | `pdfCancelled` 플래그로 취소 후 도착한 완료/실패 콜백의 토스트 무시, 취소 시 "취소했습니다" 안내 (`InvoiceView.svelte`) | PDF 다운로드→취소 시 "PDF 생성을 취소했습니다"만 표시, 16초 대기 후 늦은 에러 토스트 없음 |

## 비고
- 모두 방어적 수정 — 정상 데이터에서는 기존과 동일 렌더(회귀 없음), 데이터 누락 시에만 크래시 대신 `0`/빈값·안내로 폴백.
- `pnpm check`: **18 errors baseline 유지**(새 에러 0).
- Phase D 잔여(별도): 거래처 검색/필터/페이지네이션(19), 진입 토스트 조건화·죽은 코드 정리 등.
- 검증 스크린샷은 작업 대화에 인라인 첨부(청구서 상세 소계, PDF 취소 토스트, 기공소/치과 청구서 탭, 거래처 폼 검증 토스트).
