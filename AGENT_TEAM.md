# Concourse 엔지니어링 오케스트레이터

사용자가 "에이전트 팀" 또는 "agent team"을 언급하면 이 파일의 지시를 따릅니다.
3-Agent 하네스: Planner → Generator → Evaluator 파이프라인을 자동 실행합니다.

---

## 프로젝트 컨텍스트

- **앱**: Concourse (구 Dentaroute) — 해외 환자 ↔ 한국 치과의사 연결
- **기술**: React Native (Expo Web), react-native-web, StyleSheet
- **실행**: localhost:8081
- **브랜드**: 환자 보라(#7C3AED), 의사 틸(#0D9488)

---

## 실행 흐름

```
[사용자 프롬프트]
       ↓
  ① Planner → SPEC.md 생성
       ↓
  ② Generator → output/ 결과물 + SELF_CHECK.md
       ↓
  ③ Evaluator → QA_REPORT.md
       ↓
  ④ 합격 → 완료 / 불합격 → ②로 (최대 3회)
```
---

## 단계별 실행 지시

### 단계 1: Planner 호출
```
agents/planner.md 파일을 읽고, 그 지시를 따라라.
agents/evaluation_criteria.md 파일도 읽고 참고하라.
사용자 요청: [사용자가 준 프롬프트]
결과를 SPEC.md 파일로 저장하라.
```

### 단계 2: Generator 호출

최초 실행:
```
agents/generator.md 파일을 읽고, 그 지시를 따라라.
agents/evaluation_criteria.md 파일도 읽고 참고하라.
SPEC.md 파일을 읽고, 전체 기능을 한 번에 구현하라.
결과를 output/ 폴더에 저장하라.
완료 후 SELF_CHECK.md를 작성하라.
```

피드백 반영 시 (2회차+):
```
agents/generator.md, evaluation_criteria.md, SPEC.md를 읽어라.
output/ 폴더의 현재 코드를 읽어라.
QA_REPORT.md를 읽어라. 이것이 QA 피드백이다.
QA 피드백의 "구체적 개선 지시"를 모두 반영하라.
"완전히 다른 접근 시도"이면 디자인 컨셉 자체를 바꿔라.
```
### 단계 3: Evaluator 호출
```
agents/evaluator.md 파일을 읽고, 그 지시를 따라라.
agents/evaluation_criteria.md를 읽어라. 이것이 채점 기준이다.
SPEC.md를 읽어라. 이것이 설계서다.
output/ 폴더의 결과물을 읽어라. 이것이 검수 대상이다.
결과를 QA_REPORT.md 파일로 저장하라.
```

### 단계 4: 판정 확인
- "합격" → 완료 보고
- "조건부/불합격" → 단계 2로 (최대 3회)

---

## 완료 보고 형식

```
## 하네스 실행 완료

**결과물**: output/ 폴더
**설계 기능 수**: X개 | **QA 반복**: X회
**최종 점수**: 사용성 X/10, 디자인 X/10, 접근성 X/10, 기능 X/10 (가중 X.X/10)

**실행 흐름**:
1. Planner: [한 줄]
2. Generator R1: [한 줄]
3. Evaluator R1: [판정 + 피드백]
...
```

## 주의사항

- Generator와 Evaluator는 반드시 다른 서브에이전트로 호출 (분리 핵심)
- Concourse 디자인 시스템 반드시 존중
- 의료 서비스: 신뢰감, 접근성, 가독성 최우선