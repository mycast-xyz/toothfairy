# 센터 Phase A — live 검증 결과

> 2026-07-01 · 로컬 Chrome(Browser 1) · ToothFairy `localhost:5173` + 백엔드 `:3000` + 소켓 `:30090` + PostgreSQL(거래처 27개)
> 로그인: 테스트 admin 계정 `qa_admin`(all_admin, 검증용). 실데이터는 삭제하지 않음.
> 대상: [`docs/plans/03-center-qa-and-improvements.md`](../../plans/03-center-qa-and-improvements.md) Phase A.

## 검증 결과 (전부 통과)

| 항목 | 검증 | 결과 |
|---|---|---|
| **B2/B3/B4** 청구서 | /setting/invoice 진입 | 탭 2개·테이블 구조·월선택 정상, **크래시 없음**, 엔드포인트 ConfigService로 해결 ✅ |
| **B5** 거래처 삭제 UI | 삭제 버튼 클릭 | "거래처 삭제 확인" 모달(회사명 + "되돌릴 수 없습니다" 경고 + 취소/삭제) ✅ |
| **B5** 삭제 API 계약 | `DELETE /api/v0/corp/list/999999` | 백엔드 핸들러 **404 "해당 거래처를 찾을 수 없습니다"** → 라우트/메서드/경로 정확(계약 교정 검증) ✅ |
| **B6** 취소 | 취소 클릭 | 모달 닫힘 ✅ |
| **B7** STL 실패 | 잘못된 slug(`/center/show/nonexistent999`) | 전용 에러화면("출력물을 불러오지 못했습니다" + 뒤로가기/재시도), **"NaN개" 제거** ✅ |
| **B1** 메뉴 | 사이드바 | 활성 메뉴 `/setting/*` 정상(원래 OK — 비활성 메뉴만 정리) ✅ |
| 거래처 목록 | /setting/company | 27개 정상 렌더 ✅ |

## 스크린샷 (`screenshots/`)
| # | 파일 | 내용 |
|---|---|---|
| 1 | `1-invoice-B2-B3-B4.png` | 청구서 관리 — 탭·테이블·월선택, 크래시 없음 |
| 2 | `2-company-delete-modal-B5.png` | 거래처 삭제 확인 모달 |
| 3 | `3-stl-error-screen-B7.png` | STL 상세 로드 실패 전용 화면 |
| — | `center-phase-a-verification.gif` | 3화면 순차 캡처 |

## 참고
- 치과 청구서 탭은 2026년 7월 청구 데이터가 없어 0행(빈 표)으로 표시됨 — **주석 해제로 테이블 구조는 정상 렌더되며 크래시 없음**을 확인. 데이터가 있으면 행이 표시됨.
- 백엔드 Phase 1 수정(P0-4~8) 반영 상태에서 서버 정상 부팅·로그인·데이터 로딩 모두 정상.
- 보류: B8(청구서 PDF, 외부 Playwright 렌더 서버 배포 결정 필요).
