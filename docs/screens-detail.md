# Screens & Components — 상세 분석

---

## 주요 화면

### 온보딩 (`app/index.tsx`)
- 가격 비교 카드 (미국 vs 한국) 수평 스크롤
- CTA 버튼 → `/auth/role-select`

### 환자 회원가입 (`auth/patient-create-account.tsx`, ~914줄)
- 여권 이름, 이메일 6자리 OTP, 국가코드+전화, 비밀번호 강도
- 인증코드 스마트 붙여넣기, 국가코드 모달 (20+ 국가)
- Dev 모드: 검증 스킵

### 의사 회원가입 (`auth/doctor-create-account.tsx`, ~803줄)
- 환자와 동일 + 미국 치과 면허 업로드 (카메라/갤러리, 최대 3장)

### 환자 대시보드 (`patient/dashboard.tsx`)
- 케이스 목록 + 상태 뱃지, 읽지 않은 메시지/견적 수
- 예약 현재 단계, 다회 방문 진행 표시
- Clean Floating Card: 상단 4px 컬러 스트립, pill 뱃지, 연보라 border

### 의사 대시보드 (`doctor/dashboard.tsx`)
- 치료 유형별 필터 탭
- 상태별 액션 뱃지: New→Send Quote, At Clinic→Send Invoice, etc.
- Clean Floating Card: teal 톤 border

### 치료 선택 (`patient/treatment-select.tsx`)
- 13종 치과 치료, 수량 조절, 커스텀 메모

### 알림 (`notifications.tsx`)
- 역할별 다크 테마, 날짜별 그룹, 딥링크 네비게이션
- 시간 포맷터 (Just now, 5m ago, 2h ago)

### 개발자 메뉴 (`dev-menu.tsx`)
- 시드/리셋/디버그, 화면 바로가기, 예약 상태 강제 변경

---

## 컴포넌트 시스템

### 테마 컴포넌트
| 컴포넌트 | 용도 |
|---------|------|
| `ThemedText` | 테마 인식 텍스트 (default, title, defaultSemiBold, subtitle, link) |
| `ThemedView` | 테마 인식 뷰 (light/dark 배경) |
| `DentalIcon` | 21종 치과 SVG 아이콘 (64x64 viewBox, react-native-svg) |

### UI 컴포넌트
| 컴포넌트 | 용도 |
|---------|------|
| `Collapsible` | 아코디언 토글 |
| `IconSymbol` | 크로스 플랫폼 아이콘 (iOS SF Symbols / Material) |
| `ParallaxScrollView` | 250px 헤더 패럴렉스 |
| `ExternalLink` | 인앱 브라우저 |
| `HapticTab` | iOS 햅틱 탭 버튼 |

### 플랫폼별 구현
- `icon-symbol.ios.tsx` — iOS SF Symbols
- `icon-symbol.tsx` — Android/Web Material Icons
- `use-color-scheme.web.ts` — 웹 SSR 대응

---

## 디자인 패턴

- LinearGradient 배경 (역할별)
- 글래스모피즘 카드 (rgba 배경 + 보더)
- 둥근 모서리 12-20px, 그림자/elevation
- 폼 검증: 필드별 빨간 에러 텍스트
- 모달 오버레이 (국가코드, 파일 업로드)
- 8px 그리드 간격

---

## 의존성 트리

```
constants/theme.ts → useThemeColor → ThemedText, ThemedView, ParallaxScrollView
constants/colors.ts → Collapsible
lib/store.ts → 모든 app/ 화면
```
