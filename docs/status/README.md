# 기능 현황 & 할 일 (Status Docs)

이 폴더는 ToothFairy의 **핵심 기능별 현재 구현 상태**와 **앞으로 해야 할 일**을 정리한 문서다.
2026-06-30 기준, 4개 영역을 정밀 코드 분석해 작성했다. 각 항목엔 `파일:라인` 근거가 달려 있다.

| # | 문서 | 영역 | 한 줄 상태 |
|---|---|---|---|
| 01 | [01-auth-and-role.md](./01-auth-and-role.md) | 인증/권한 | role 이중구조 버그로 이임이 반영 안 됨. 권한표/리프레시 불일치 다수 |
| 02 | [02-center.md](./02-center.md) | 기공센터 | STL·거래처는 동작, **청구서는 절반 미완** |
| 03 | [03-cam-file-flow.md](./03-cam-file-flow.md) | 캠파일 흐름 | REST/소켓 동작, **기계관리(cam/manage) 빈 목업** |
| 04 | [04-lab-request.md](./04-lab-request.md) | 기공소 의뢰 | 데스크탑 등록 동작, **조회 필드 불일치 + 모바일 미구현** |

---

## 우선순위 통합 로드맵

### 🔴 P0 — 기능이 깨져 있음 (사용 불가/오작동)
1. **[인증] role 이임 반영** — roleId↔enum 매핑 + JWT 재발급 전략 (백엔드 계약 필요). `userInfo` 쿠키 `maxAge:30`초 버그 수정.
2. **[인증] 권한표 단일화** — `MENU_PERMISSIONS` vs `PermissionService.pagePermissions` 불일치로 비-admin 페이지 진입 차단 해소.
3. **[센터] 치과 청구서 탭 복구** — `DentistryInvoiceList.svelte:44-84` 주석 해제 + 깨진 링크 경로 수정.
4. **[센터] invoice 엔드포인트 정합화** — 하드코딩 경로를 config와 일치시키고 ConfigService 경유.
5. **[기공소] 등록↔조회 데이터 계약 통일** — 저장 payload와 목록 렌더 필드명이 어긋나 목록이 빈 화면.
6. **[캠] cam/manage 실구현** — 0바이트 `+page.ts` 작성, 정적 하드코딩 → 데이터 바인딩.

### 🟡 P1 — 미완성 로직
7. **[캠] complete 엔드포인트 config화** + 검색 파라미터 충돌 수정(`title`/`filename`).
8. **[센터] 종류별 단가 계산 구현** — 현재 전 종류가 `cap` 단일가로 통일됨.
9. **[기공소] 모바일 등록 재구현** + 카드 액션버튼 연결.
10. **[인증] 리프레시 엔드포인트/응답 포맷 통일**, localStorage 토큰 의존 정리.
11. **[캠] 진행률 더미값 제거**(로딩 스켈레톤), 소켓 포트 모순 해소.

### 🟢 P2 — 정리/품질 (전 영역 공통)
12. `console.log`/디버그 UI/테스트 단축키 제거.
13. 죽은 파일/코드 삭제 (`stlviewer/backup·test`, `test.html`, `test.json`, `Request.ts`, 빈 `MenuService.ts` 등).
14. 하드코딩 URL → ConfigService 이관 (전역).
15. `any` 축소, 중복 로직 단일화, 컴포넌트 네이밍 정리.
16. `import { log } from 'three/tsl'` 잔재 제거(3개 HeaderBar).

---

## ⚠️ 백엔드 계약이 필요한 항목 (프론트 단독 불가)
- JWT의 `userRole` 클레임 = `roleId` 매핑의 단일 소스 보장.
- role 이임 후 당사자 토큰 무효화/재발급.
- 리프레시 경로/응답 스키마 확정.
- 등록 의뢰서 저장 스키마 ↔ 목록 조회 응답 스키마 정합.
- Playwright PDF 렌더 서버, Socket.IO 서버(별도 레포)의 가동/포트.
