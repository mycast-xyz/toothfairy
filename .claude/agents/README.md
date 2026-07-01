# ToothFairy 팀 에이전트

치과기공 관리 시스템(ToothFairy/킹덕) 개발을 위한 Claude Code 서브에이전트 팀.
유명 GitHub 컬렉션(wshobson/agents, VoltAgent, contains-studio 등)의 검증된 패턴을
이 프로젝트 스택(SvelteKit 2 · Svelte 5 레거시 문법 · TS · Tailwind, model/service/view 아키텍처,
분리형 백엔드 + Socket.IO, RBAC)에 맞게 커스터마이징했다.

## 구성원 (7)

| 에이전트 | 역할 | 주요 산출물 |
|---|---|---|
| `product-planner` | 기획/PM | PRD, 사용자 스토리, 수용 기준, 태스크 분해 |
| `architect` | 아키텍트 | 구조 설계, 리팩토링 전략, 기술부채 정리안 |
| `ui-designer` | UI/UX 디자인 | Tailwind 레이아웃, 반응형/다크모드, 컴포넌트 |
| `svelte-developer` | 프론트 개발(주력) | 라우트/컴포넌트/store/service 구현 |
| `backend-integration` | 백엔드 연동 | API service, JWT 인증, Socket.IO, 타입 계약 |
| `qa-engineer` | QA/테스트 | Vitest 테스트, 엣지케이스 검증, 버그 리포트 |
| `code-reviewer` | 코드 리뷰 | 버그/보안/컨벤션/아키텍처 검토(읽기 전용) |

## 권장 협업 흐름

```
기획(product-planner) → 설계(architect) → 구현(svelte-developer + backend-integration)
                                              → 리뷰(code-reviewer) → 검증(qa-engineer)
```

- 작은 작업: 곧장 `svelte-developer`(또는 `ui-designer`)로.
- 새 기능/모호한 요구: `product-planner`로 먼저 정의.
- 구조가 걸리는 큰 변경: `architect`로 설계 먼저.
- 구현 직후: `code-reviewer` → `qa-engineer` 순으로 확인.

## 사용법
- 자동 위임: 작업 성격에 맞으면 Claude가 알아서 해당 에이전트를 호출한다.
- 명시 호출: "product-planner 에이전트로 ~ 정리해줘" 처럼 이름을 지정.
- 이 파일들은 프로젝트 단위(`.claude/agents/`)라 git에 커밋하면 팀원과 공유된다.

## 커스터마이징
각 `.md`의 frontmatter(`description`, `tools`)와 본문 지시문을 수정해 조정한다.
`model:` 필드는 비워 두어 현재 세션 모델을 상속한다(필요 시 명시 가능).
