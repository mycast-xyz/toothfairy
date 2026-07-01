# 기획안 04 — 기공센터 파우더(분말) 관리 페이지

> 작성 2026-07-01 · 상태: **Phase 1 구현 완료 / Phase 2 대기**
>
> **Phase 1 완료(2026-07-01, 커밋 프론트 `6965365`·백엔드 `ea4d1a5`)**: 골격 + 센터 유닛 자동 연동(읽기).
> - 백엔드 `GET /api/v0/powder/units?date=YYYY-MM`(인증) — `centerStlList`를 일자+종류로 집계 → 스트림(capPartial/allonfour) 일자별 유닛(정상+리메이크, 커스텀 제외).
> - 프론트 `/center/powder` — 월선택 + 일자별 유닛 테이블(다크모드) + 사이드바 메뉴(MENU_PERMISSIONS).
> - 검증: 6월 21일치, 월합계 캡파샬 1433·올온포 3.
> - **Phase 2 착수 전 필요**: **A-3 통 용량(g)** 값(소모량 계산의 전제) + A-1(커스텀 제외)·A-2(정상+리메이크) 확정.
> 요청: 기공센터에 "청구서 관리처럼 테이블" 형태의 파우더 관리 페이지 신설. 매일 파우더 남은 량을 입력하면 전날 대비 **소모량**과 **출력 유닛당 파우더 사용량**을 산출해 보여준다.
> 관련: 유닛 집계 엔진 [`InvoiceCommonService`](../../src/app/service/invoice/InvoiceCommonService.ts), 참고 화면 [`setting/invoice`](../../src/routes/setting/invoice/+page.svelte), 센터 QA [`03-center-qa-and-improvements.md`](./03-center-qa-and-improvements.md).

---

## 0. 한 줄 정의

기공센터가 **매일 파우더 재고(남은 량)를 입력**하면, 시스템이 **전날 대비 소모량**과 **그날 출력한 유닛 수 대비 유닛당 파우더 사용량**을 자동 계산해 일자별 테이블로 보여주는 소모/효율 관리 페이지.

---

## 1. 확정된 도메인 규칙 (사용자 결정)

| 항목 | 결정 |
|---|---|
| **파우더 종류(스트림)** | **2종.** ① **캡·파샬 공용** 파우더, ② **올온포** 파우더. 매일 두 스트림의 남은 량을 각각 입력 |
| **보충(입고) 처리** | 보충량도 입력. 새 파우더가 들어오면 **"한 통 추가"** 방식 — 재고에 통 단위로 더함(통 수 × 통 용량) |
| **유닛 수 출처** | **센터 출력물 데이터 자동 연동** — 그날 출력한 캡/파샬/올온포 유닛 수를 자동 집계해 유닛당 사용량 산출 |

### 확인 필요 (가정하고 진행, 사용자 확정 대기)
- **A-1. 커스텀(custom) 출력물**은 파우더 추적 대상에서 **제외**로 가정(요청에 캡/파샬·올온포만 언급됨). 커스텀도 어느 스트림에 포함해야 하면 알려줄 것.
- **A-2. 유닛 = 정상 + 리메이크 합산**으로 가정(둘 다 실제 출력되어 파우더를 소모). 리메이크는 제외해야 하면 알려줄 것.
- **A-3. 통 용량(g)**: 파우더 스트림별 1통 용량 상수값 필요(예: 캡·파샬통 = ?g, 올온포통 = ?g). 초기엔 프론트 상수로 두고, 이후 설정 페이지로 이관.
- **A-4. 파우더 소모는 센터 전체 단위**(거래처 무관)로 가정 — 거래처별이 아니라 그날 센터가 출력한 총 유닛 기준.

---

## 2. 계산식

기호: `R_prev` 전날 남은량, `R_today` 오늘 남은량, `B` 오늘 보충 통 수, `C` 통 용량(g), `U` 그날 해당 스트림 유닛 수.

```
보충량(g)      = B × C
소모량(g)      = R_prev + (B × C) − R_today
유닛당 사용량   = 소모량 ÷ U        (g/유닛)
```

- **캡·파샬 스트림**: `U = 캡 유닛 + 파샬 유닛` (정상+리메이크, A-2)
- **올온포 스트림**: `U = 올온포 유닛`

### 엣지 케이스 처리
| 상황 | 처리 |
|---|---|
| 첫 기록일(전날 데이터 없음) | 소모량·유닛당 사용량 계산 불가 → 남은량만 저장, 계산 열은 "—"(기준값 역할) |
| 보충으로 오늘 남은량 > 전날 남은량 | 보충량을 더해 계산하므로 정상 처리(소모량 ≥ 0 유지). 보충 없이 남은량이 늘면 **입력 오류 경고**(음수 소모량) |
| 해당일 유닛 = 0 인데 소모량 > 0 | 나눗셈 불가 → 유닛당 사용량 "—" + 안내(재고 감소했으나 출력 기록 없음) |
| 중간 결측일(입력 누락) | 그날 행은 미입력 상태로 표시, 소모량 계산은 "직전 입력일" 기준이 아니라 **인접 입력일 간**으로 처리할지 결정 필요(→ 오픈이슈 O-2) |
| 음수/비정수 통 수, 음수 남은량 | 입력 검증 거부(0 이상, 통 수는 정수) |

---

## 3. 화면 설계 (청구서 관리 패턴 재사용)

`setting/invoice` 구조(= `PageHeaderBar` + `MonthDatePicker` + 검색 + 테이블)를 그대로 차용하되, 거래처 탭/필터 대신 **월 선택 + 일자별 파우더 테이블**로 구성.

### 레이아웃 (권장안)
- 상단: `PageHeaderBar`("파우더 관리" / "일일 파우더 소모량 및 유닛당 사용량 관리") + `MonthDatePicker`(월 선택) + 저장 버튼
- 본문: **일자(1~말일) 행 × 파우더 2 스트림 컬럼 그룹** 테이블

```
                 │        캡 · 파샬 파우더             │           올온포 파우더
 날짜   │ 요일 │ 남은량 │ 보충(통) │ 소모량 │ 유닛 │ g/유닛 │ 남은량 │ 보충(통) │ 소모량 │ 유닛 │ g/유닛
────────┼──────┼───────┼─────────┼───────┼─────┼───────┼───────┼─────────┼───────┼─────┼───────
06-01  │ 월   │ [입력]│  [입력] │   —    │  12 │   —   │ [입력]│  [입력] │   —    │  3  │   —
06-02  │ 화   │ [입력]│  [입력] │  340   │  18 │ 18.9  │ [입력]│  [입력] │  120   │  5  │ 24.0
 ...
────────┴──────┴───────┴─────────┴───────┴─────┴───────┴───────┴─────────┴───────┴─────┴───────
 소계/평균        누적 소모 …          월평균 g/유닛          누적 소모 …        월평균 g/유닛
```

- **남은량·보충(통)** 셀은 인라인 입력(그날 값 입력 후 저장). **소모량·유닛·g/유닛**은 계산·자동연동 값(읽기 전용).
- 유닛 열은 센터 출력물에서 자동 채움(A-2/A-4). 회색 배경으로 "자동" 구분.
- 하단 소계 행: 월 누적 소모량, 월평균 유닛당 사용량(효율 지표).
- 다크모드(`dark:`) 대응, Remixicon 아이콘, 레거시 Svelte 문법(주변 파일 기준) 준수.

### 대안 (검토용)
- **입력 분리형**: 상단에 "선택일 입력"(남은량·보충·저장) 폼 + 하단 월 테이블은 읽기 전용. 매일 한 줄만 입력하는 UX엔 이 편이 단순 — O-3에서 결정.

---

## 4. 데이터 모델 / 백엔드 계약 (가정 — 확정 필요)

> CLAUDE.md 원칙: 백엔드 응답이 불확실하면 추측 구현하지 않고 계약을 명시해 확인받는다. 아래는 **제안 계약**.

### 신규 테이블 (제안)
```
powder_daily
  id            PK
  powder_type   'cap_partial' | 'allonfour'
  record_date   DATE
  remaining_amt NUMERIC   -- 그날 남은량(g)
  refill_bottles INT DEFAULT 0  -- 그날 보충 통 수
  created_by / created_at / updated_at
  UNIQUE(powder_type, record_date)

powder_config (또는 초기엔 프론트 상수)
  powder_type   PK
  bottle_capacity_g  NUMERIC  -- 통 용량(g)
  unit_label    TEXT DEFAULT 'g'
```

### 엔드포인트 (제안, ConfigService 경유 — 하드코딩 금지)
| 목적 | 메서드/경로 | 응답(요지) |
|---|---|---|
| 월 조회 | `GET /api/v0/powder/list?date=YYYY-MM` | 일자별 2스트림 기록(남은량/보충) + **일자별 유닛 합계(캡·파샬·올온포)** |
| 저장(upsert) | `POST /api/v0/powder` | `{powder_type, record_date, remaining_amt, refill_bottles}` |
| (선택) 설정 | `GET/PUT /api/v0/powder/config` | 통 용량 등 |

- **유닛 합계 데이터 소스**: 파우더는 **일자별** 유닛이 필요하다. 기존 `GET /api/v0/invoice/center/list?date=YYYY-MM`는 **월별·거래처별** 집계라 일자 granularity가 없다. 반면 센터 출력물 데이터에는 `printDate`가 있으므로(`InvoiceCommonService`의 `stlListData.printDate`, center/print의 `file/check` 응답), **일자·종류별 유닛 합계**는 ① `file/check?date=YYYY-MM` 응답을 `printDate`+종류로 groupBy 하거나 ② 신규 백엔드 일자별 유닛 합계 엔드포인트로 얻는다. → **O-1에서 확정.**
- 소모량/유닛당 사용량은 **프론트 계산**(PowderCalcService)으로 시작해도 되고, 백엔드가 계산해 내려줘도 된다. 초기엔 프론트 계산 권장(백엔드 변경 최소화).

---

## 5. 구현 파일 목록 (레이어 분리 준수)

| 레이어 | 파일 | 역할 |
|---|---|---|
| model | `src/app/model/powder/PowderType.ts` | 스트림 정의(`cap_partial`/`allonfour`)·통 용량 상수·타입. `InvoicePageType`(cap/partial/allonfour) 재사용 |
| model | `src/app/model/powder/PowderRecord.ts` | 일자별 기록/집계 인터페이스(JSDoc 한국어) |
| service | `src/app/service/powder/PowderService.ts` | axios + `ConfigService.getApiEndpoint/getBackendUrl` + `authService` 토큰. 월 조회/저장. (`RequestService` 패턴) |
| service | `src/app/service/powder/PowderCalcService.ts` | 소모량·유닛당 사용량 계산 + writable store 캡슐화. (`InvoiceCommonService` 집계 패턴) |
| view | `src/app/view/powder/PowderUsageTable.svelte` | 일자별 파우더 테이블(얇은 표시 + 인라인 입력). (`LabInvoiceList` 패턴) |
| route | `src/routes/center/powder/+page.ts` | 얇은 load — configService URL, date param, 리스트 fetch. (`setting/invoice/+page.ts` 패턴) |
| route | `src/routes/center/powder/+page.svelte` | 조립 — PageHeaderBar + MonthDatePicker + 저장 + 테이블. (`setting/invoice/+page.svelte` 패턴) |

**수정할 기존 파일 (메뉴 등록 2곳)**
- `src/app/view/menu/SliderMenu.svelte` — "기공센터" 섹션(청구서 관리 `</li>` 뒤, ~181행)에 `<li><a href="/center/powder">…파우더 관리</a></li>` 정적 블록 추가.
- `src/app/model/user/UserRole.ts` `MENU_PERMISSIONS`(~78행, 기공센터 항목 근처)에 `{ path:'/center/powder', label:'파우더 관리', icon:'ri-flask-line', roles:['all_center','all_admin'], section:'기공센터' }` 추가 → 라우트 접근 권한도 자동 반영(`PermissionService`가 이 표에서 파생).

**재사용 컴포넌트**: `PageHeaderBar`, `datepicker/MonthDatePicker`, `SearchableDropdown`/`DropdownFilter`(필요 시), `ConfigService`(편의 export), `InvoiceCommonService` 유닛 집계 로직 참조.

---

## 6. 단계별 로드맵

### Phase 1 — 골격 + 자동 연동(읽기)
1. model/route/menu 뼈대 생성, `/center/powder` 진입 + 권한 등록.
2. 월 선택 시 **일자별 유닛 합계 자동 표시**(O-1 데이터 소스 확정 후). 아직 남은량 입력 없음 — 유닛 컬럼만 채워 연동 검증.

### Phase 2 — 입력 + 계산
3. 남은량·보충(통) 인라인 입력 + 저장(POST) 연결(백엔드 계약 확정 후).
4. `PowderCalcService`로 소모량·유닛당 사용량 계산·표시 + 엣지케이스 처리(첫날/유닛0/음수 경고).
5. 하단 소계·월평균 효율 지표.

### Phase 3 — 다듬기
6. 통 용량 설정(상수→설정 페이지), 다크모드/반응형, 입력 검증 강화, 커스텀 포함 여부(A-1) 반영.

---

## 7. 오픈 이슈 / 결정 필요

- **O-1. 일자별 유닛 합계 데이터 소스**: 프론트에서 `file/check` 응답을 일자·종류로 groupBy 할지, **신규 백엔드 엔드포인트**(일자별 캡/파샬/올온포 유닛 합계)를 만들지. 백엔드 작업 여부와 직결 → 백엔드와 합의 필요.
- **O-2. 결측일 처리**: 입력 안 한 날이 중간에 있으면 소모량을 "직전 입력일 기준"으로 이어 계산할지, 인접일만 계산할지.
- **O-3. 입력 UX**: 월 테이블 셀 직접 편집형 vs 상단 "선택일 입력 폼 + 읽기전용 테이블"형.
- **A-1~A-4** (§1): 커스텀 포함 여부, 정상+리메이크 합산 여부, 통 용량 값, 센터 전체 단위 여부.

> 본 문서는 기획·설계 단계이며 코드는 미변경. 착수 시 O-1(데이터 소스)과 A-3(통 용량)을 먼저 확정할 것.
