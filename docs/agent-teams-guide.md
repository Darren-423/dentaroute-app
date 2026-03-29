# Agent Teams 사용 가이드 (실전 경험 기반)

---

## 활성화
`~/.claude/settings.json`에 추가:
```json
{ "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
```

---

## 최적 팀 구성 패턴

### 패턴 1: 리서치 → 기획 파이프라인 (4인)
UX 기획, 아키텍처 설계 등 리서치가 필요한 작업.
```
Research Agent — 업계 벤치마킹, 데이터 수집
Experience Agent — 사용자 관점 워크스루, 감성/마찰점 평가
Planner Agent — 리서치 종합, 기획서 작성
QA Agent — 논리적 모순/기술적 문제 발견, 최종 승인
```
흐름: Research + Experience 병렬 → Planner 종합 → QA 비평 → Planner 수정 → QA 승인

### 패턴 2: 테스트 → 수정 루프 (4인)
기존 코드 문제점 발견 + 수정.
```
Patient/Tester — 실제 사용자처럼 워크스루, 문제 발견
Planner — 문제점 분류, 수정 방향, 우선순위
Generator — 코드 수정 후 재테스트 요청
QA — 단순성/품질 기준 비평, 최종 승인
```

### 패턴 3: 병렬 구현 (3인)
독립 파일/모듈 동시 수정. 같은 파일 금지!

---

## 실전 노하우

### 에이전트 프롬프트 작성
- 역할 명확히 ("You are the QA Agent. You judge by ONE metric: simplicity.")
- 읽어야 할 파일 목록 구체적으로 지정
- 다른 에이전트 이름과 소통 방법 안내
- Task 번호로 진행 상태 추적

### 소통 관리
- `SendMessage`로 에이전트끼리 직접 대화 가능 (lead 중계 불필요)
- 멈추면 lead가 넛지 ("Send your instructions to generator now")
- idle 알림 = 정상 (메시지 대기 중, 에러 아님)

### 팀 생명주기
1. `TeamCreate` → 팀 생성
2. `TaskCreate` × N → 작업 목록
3. `Agent` × N (`team_name`, `run_in_background`) → 스폰
4. 에이전트끼리 `SendMessage`로 작업
5. 완료 → `SendMessage(type: shutdown_request)` → 종료
6. `TeamDelete` → 정리

### 주의사항
- 팀 삭제 전 모든 에이전트 먼저 종료
- 한 세션에 팀 하나만 운영
- `mode: "bypassPermissions"` → 파일 읽기/쓰기 허가 안 물어봄
- 강제 정리: `rm -rf ~/.claude/teams/{name} ~/.claude/tasks/{name}`
- subagent(Agent tool) vs team agent: subagent는 lead에게만 보고, team agent는 서로 대화 가능
