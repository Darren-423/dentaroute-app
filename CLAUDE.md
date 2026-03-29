# Concourse — 프로젝트 가이드

> 해외 환자 ↔ 한국 치과의사 매칭 플랫폼 (Dental Tourism)
> 앱 이름: **Concourse** | 패키지: `com.darrenjskwon.Dentaroute`

---

## 핵심 정보

| 항목 | 값 |
|------|-----|
| 프레임워크 | Expo ~54 · React Native 0.81 · TypeScript strict |
| 라우팅 | expo-router (파일 기반) |
| 데이터 | AsyncStorage 로컬 저장 (백엔드 없음, 데모용) |
| 역할 | Patient + Doctor 듀얼 롤 |
| 빌드 | EAS Build (preview: APK, production: 미설정) |
| 특이 | New Architecture · React Compiler 실험 |

---

## 디렉토리 요약

```
app/
  index.tsx              온보딩/스플래시
  auth/                  로그인·회원가입 (5 screens)
  patient/               환자 화면 (~30 screens)
  doctor/                의사 화면 (9 screens)
  notifications.tsx      공통 알림
  dev-menu.tsx           개발자 테스트 메뉴

components/              재사용 UI (DentalIcon, ThemedText, etc.)
constants/theme.ts       PatientTheme · DoctorTheme · SharedColors · Fonts
constants/colors.ts      레거시 컬러 팔레트
lib/store.ts             전체 데이터 레이어 (~1,100줄)
docs/                    기능 스펙 + 참조 문서
```

---

## 아키텍처 패턴

1. **파일 기반 라우팅** — `app/` 구조 = 라우트, `_layout.tsx` = 네비게이션 래퍼
2. **듀얼 롤** — `store.setCurrentUser(role, name)` → `/patient/*` or `/doctor/*`
3. **오프라인 퍼스트** — AsyncStorage, `seedDemoData()`로 데모 즉시 가능
4. **상태 머신 UI** — 케이스 3단계 + 예약 10단계 상태에 따라 UI 자동 변경

---

## 테마 시스템 (constants/theme.ts)

```
PatientTheme.primary     #4A0080 (Purple)
PatientTheme.authGradient ["#7B2FBE", "#3A0068", "#1A002E"]
DoctorTheme.primary      #0F766E (Teal)
DoctorTheme.authGradient ["#0d3d38", "#0D9488", "#f0fdfa"]
SharedColors.bg          #f8fafc
```

- 환자 화면 → `PatientTheme` / 의사 화면 → `DoctorTheme`
- 공통 컴포넌트는 테마를 props로 받도록 설계

---

## 핵심 데이터 흐름

```
환자: 케이스 제출 → 견적 수신 → 견적 수락 → 예약 생성 → 치료 → 결제 → 리뷰
의사: 케이스 확인 → 견적 작성 → 채팅 → 인보이스 발행 → 수익 확인
```

**예약 상태:**
```
confirmed → flight_submitted → arrived_korea → checked_in_clinic
→ treatment_done → between_visits → returning_home
→ payment_complete → departure_set   (+ cancelled 어디서든)
```

---

## 현재 상태

- **데모/프로토타입** — 백엔드·결제·번역 미연동 (UI만 완성)
- **구현 완료**: 다회 방문 빌링, 티어 수수료, 취소/환불, 채팅 번역(mock)
- **확장 포인트**: store.ts를 API 클라이언트로 교체 가능 (인터페이스 동일)

---

## 개발 규칙

- Expo 서버 절대 자동 시작 금지 — `--tunnel` 모드, Darren이 요청할 때만
- `main` 브랜치 직접 push 금지 — devdesign / devnewflow / dev / dev2 사용
- UI 텍스트에 "Concourse" 사용 (DentaRoute 아님)

---

## 상세 참조 문서 (필요 시 읽기)

| 문서 | 내용 |
|------|------|
| [`docs/data-models.md`](docs/data-models.md) | TypeScript 인터페이스 전체 (Case, Quote, Booking, Chat, Review 등) |
| [`docs/store-api.md`](docs/store-api.md) | Store 메서드 전체 목록 + 스토리지 키 + 데이터 패턴 |
| [`docs/navigation-flow.md`](docs/navigation-flow.md) | 전체 라우팅 구조 + 환자/의사 여정 플로우 |
| [`docs/screens-detail.md`](docs/screens-detail.md) | 화면별 상세 분석 + 컴포넌트 시스템 + 디자인 패턴 |
| [`docs/changelog.md`](docs/changelog.md) | 변경 이력 (최신순) |
| [`docs/agent-teams-guide.md`](docs/agent-teams-guide.md) | Agent Teams 사용 패턴 + 실전 노하우 |
| [`docs/design-mastery.md`](docs/design-mastery.md) | 디자인 7단계 마스터리 가이드 |
| [`docs/multi-visit-billing-spec.md`](docs/multi-visit-billing-spec.md) | 다회 방문 빌링 스펙 |
| [`docs/tiered-platform-fee-spec.md`](docs/tiered-platform-fee-spec.md) | 티어별 수수료 스펙 |
| [`docs/per-visit-discount-spec.md`](docs/per-visit-discount-spec.md) | 방문별 할인 스펙 |
