# 03. 캠파일 데이터 흐름 (CAM File Flow)

> 파일 데이터 레이어(REST 6종)와 소켓 클라이언트는 **실제 동작**하나, **`cam/manage`(기계관리)는 빈 목업**이고
> complete 하드코딩·검색 파라미터 충돌·진행률 더미값 등 미완성이 남아 있다.
> 참고: **STL 3D 뷰어는 CAM이 아니라 센터(`center/show`)에서만** 사용된다.

## 관련 파일
- 라우트: `routes/cam/print/*`, `routes/cam/manage/*`(신규/미완)
- 서비스: `app/service/cam/{CamDataService,CamSocketService,CamPrintView}.ts`
- 모델: `app/model/cam/{PrintData,PrintUtils}.ts`
- 뷰: `app/view/cam/{PrintView,BackupResetModal}.svelte`, `app/view/stlviewer/{PrintOutPutViewer,backup,test}.svelte`
- 문서: `docs/CAM_SOCKET_IO_README.md`, `docs/SOCKET_SETUP_README.md`

---

## 파일 흐름
**센터(검수)** → 백엔드 파일워처가 `urgent`/`normal` 폴더로 이동(프론트에 전송 로직 없음, 추정) → **CAM(수신물 목록화)**.

REST 6종 (`CamDataService.ts`, 전부 axios+JWT 연결됨):
1. **receipts** `fetchCamPrintListFromApi:21-94` — `GET /api/v0/cam/data/receipts`, 필터 쿼리화, 구버전 구조 호환. 초기 로드는 `cam/print/+page.ts:5-84`.
2. **표시/매핑** `CamPrintView.updatePrintListData:230-261` → `PrintView.svelte:582-700` 테이블.
3. **download single** `downloadCamFileById:100-158` — blob + Content-Disposition. UI: `PrintView:649-656`.
4. **download multi(zip)** `downloadCamFilesAsZip:165-218` — **UI 주석처리**(`PrintView:332-341`), 서비스만 생존.
5. **complete** `completeCamFileById:225-261` — **엔드포인트 하드코딩**(`:232` `'/api/v0/cam/data/complete' // 실제 엔드포인트에 맞게 수정`, config에 값 있는데도 미사용). UI: `PrintView:680-686`.
6. **progress** `fetchCamProgressFromApi:267-307` — config `cam.progress` 사용, 1초 디바운스 후 진행률 바 4종 매핑.

**연결 결론**: REST 6종 실제 연결(mock 아님). 백엔드 부재 시 빈 목록/에러 토스트로 graceful.

## Socket.IO (`CamSocketService.ts`) — 클라이언트 완성도 높음
- `ws://localhost:30090` 연결, JWT `auth.token` 전달, 싱글톤, `waitForConfig` 후 초기화.
- 이벤트: connect/disconnect/reconnect 계열, `cam/print/{status,progress,notification}`, 폴더 모니터링 다수(`unified-monitor-*`, `folder-monitor-*`, `folder-changed`, `file-event`, `folder-changes-batch`, `.DS_Store` 필터).
- 401 계열에서 `refreshJwtToken`→소켓 재초기화(`:580-657`). 방어적.
- **단, 대부분 이벤트가 데이터 직접 push가 아니라 `refreshPrintListFromDB()`(REST 재호출)를 트리거**. 소켓=변경알림, 진실원천=REST.
- 실제 **소켓 서버는 별도 레포**(`toothfairy-socket-server`) → 이 코드만으론 검증 불가(추정).

## STL 뷰어
- 실사용 = `PrintOutPutViewer.svelte`(별칭 MultiSTLViewer), three.js 격자 다중 렌더. **`center/show/[slug]:9`에서만 import.**
- `backup.svelte`/`test.svelte`는 **어디서도 import 안 됨**(전신 실험 잔재, 삭제 대상).
- 공통: `renderer.dispose()`/geometry dispose 없음 → STL 재로드 시 **메모리 누수**(`PrintOutPutViewer:41-55`).

## cam/manage (기계관리) — 빈 목업
- 디렉터리 전체 **untracked**, `static/assets/machine/`도 untracked. `UserRole.ts`에 메뉴 항목만 추가.
- **`+page.ts` 0바이트**. `+page.svelte:1-149`는 전부 하드코딩 정적: 6기계 테이블(툴 소비 전부 0), 지그 버튼 1개, `slotCounts=[0,0,0,0,0]` 클릭 시 숫자만 증가(`:6-10,127-144`). 백엔드/서비스/모델 전무.
- 죽은 import: `onMount/onDestroy`(`:2`), `browser`(`:3`) 미사용. 이미지 파일명에 공백(`jiny f4t.webp`).

## 미완성/버그 목록
1. **cam/manage 전체** 목업.
2. **complete 엔드포인트 하드코딩**(`CamDataService:232`).
3. **멀티 다운로드 UI 주석처리**(`PrintView:332-341`).
4. **진행률 더미 데이터** — `PrintUtils:140-169` `DEFAULT_PROGRESS_BAR_DATA`가 `32.5%/650/2000` 가짜 수치 노출.
5. **진행률 제목 3곳 불일치** — `CamPrintView:292-327`(라이브) vs `:330-365` vs `PrintUtils:140-169`.
6. **검색 파라미터 충돌(버그)** — `filterPrintList`에서 검색어와 카테고리를 **둘 다 `filterParams.title`**(`CamPrintView:422,431`)에 넣어 덮어씀. `refreshFromDB`는 검색어를 `filterParams.filename`(`:558`)으로 → 메서드마다 파라미터명 불일치.
7. **"취소"/`stopPrintJob`** — 소켓 `command/stopPrint` emit만, 되돌리는 REST 없음 → 비동작 의심(`PrintView:687-693`).
8. **메서드명 혼동** — `CamPrintView:487` `startPrintJob`이 실제로는 **완료처리**(`completeCamFileById` 호출).
9. **소켓 명령 미사용** — `requestPrintStatus/Progress`(`:668-697`), 소켓 `startPrintJob`(`:700-714`) 호출처 없음.
10. **포트 모순** — config `server.socket.port:8080` vs `baseUrl:ws://localhost:30090`, 문서는 또 8080.
11. **죽은 STL 파일** `backup/test.svelte`, `redirectToLogin` 데드코드(`CamSocketService:660-665`).

## 품질 문제
- console.log: `CamSocketService` 68, `CamPrintView` 14, `PrintView` 13, `CamDataService` 12.
- any: `CamSocketService` `:any` 15회+`as any` 3회, 자체 `SocketIOClient` 인터페이스(`:7-14`)로 공식 타입 우회.
- `subscribe(v=>x=v)()` 즉시구독-해제 안티패턴 다수(`get(store)` 정석) — `CamPrintView` 곳곳.
- 중복: 소켓 초기화(`:108-135`↔`635-650`), 다운로드 blob 처리(`CamDataService:131-153`↔`194-211`), 재연결(내장+수동 이중).
- 상태 의미 혼동: `PrintUtils:19-31` `received→다운로드전`, `processing→다운로드완료`, `completed→가공완료`.

## ✅ 할 일
**P0**: ① `cam/manage` 실구현(`+page.ts` 작성, 하드코딩→바인딩, 미사용 import 제거) ② complete config화(`:232`) ③ 검색 파라미터 충돌 수정(`:422/431/558`) ④ 취소/stopPrintJob 동작 정의 또는 버튼 제거 ⑤ 멀티 다운로드 UI 복구 여부 결정.
**P1**: ⑥ 진행률 더미/제목 통일(로딩 스켈레톤) ⑦ 소켓 포트 모순 해소+문서 동기화 ⑧ `startPrintJob`→`completeJob` 개명.
**P2**: ⑨ 죽은 파일 삭제(`backup/test.svelte`, `test.html`, `.DS_Store`) ⑩ console.log 정리(특히 68개) ⑪ any→`socket.io-client` 타입 ⑫ `get(store)` 치환 ⑬ 초기화/blob 중복 통합 ⑭ STL 리소스 dispose 추가 ⑮ 미사용 import 정리(`CamPrintView:27-31`).
