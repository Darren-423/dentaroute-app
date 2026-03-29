# Changelog — 변경 이력 (최신순)

---

### 2026-03-20 — Edit Profile DOB + 대시보드 UI 리뉴얼 + 의사 헤더 정리
- **파일**: `edit-profile.tsx`, `dashboard.tsx` (patient+doctor), `profile.tsx`
- **Edit Profile DOB**: ScrollView → 드롭다운 3개 + 바텀시트 Modal (Year 검색)
- **Patient Dashboard 헤더**: 아이콘 순서 settings→bell→dots, Menu Item 3 삭제
- **Patient Dashboard 카드**: Clean Floating Card — 상단 4px 컬러 스트립, pill 뱃지, 연보라 border(`#ddd6e8`)
- **Doctor Dashboard 카드**: 동일 Clean Floating 스타일, teal 톤 border(`#cddbd9`)
- **Doctor 헤더 아이콘**: 4개→2개(수익/알림), emoji→Feather, 뱃지 숫자→빨간 dot

### 2026-03-16 — My Reservations 통합 달력 업그레이드
- **파일**: `reservation.tsx`
- My Trips 데이터를 달력에 통합 (도착=하늘색, 출발=오렌지, 숙박=하늘색 바)
- 멀티 도트 시스템, 범례 추가, Trip 카드 Edit Trip 딥링크
- 달력 크기 확대: 셀 48→56, 폰트 15→17

### 2026-03-16 — My Trips 딥링크 수정 모달 자동 오픈
- **파일**: `my-trips.tsx`
- `editTripId` query param → 수정 모달 자동 오픈

### 2026-03-16 — 시드 데모 데이터에 여행 정보 추가
- **파일**: `lib/store.ts`
- SavedTrip 2건: Korean Air KE082 (3/15), Asiana OZ201 (6/20)

### 2026-03-16 — 팀 워크플로우 가이드 문서
- **파일**: `docs/team-workflow-guide.md`, `docs/development-plan.md`
- 브랜치 전략, AI 행동 규칙, 커밋 규칙 문서화
