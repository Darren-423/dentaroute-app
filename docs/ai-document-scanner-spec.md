# DentaRoute: AI Document Scanner
## 항공권/호텔 예약 사진 → 자동 정보 추출
### Implementation Spec for Claude Code

---

## 1. 목표

환자가 항공권 확인서, 호텔 예약 확인서 사진(스크린샷)을 올리면
AI가 자동으로 핵심 정보를 추출하여 입력 필드에 자동 채움.

**적용 화면:**
- `app/patient/arrival-info.tsx` — 항공편 정보 자동 채움
- `app/patient/hotel-arrived.tsx` — 호텔 정보 자동 채움 (향후 확장)
- `app/patient/departure-pickup.tsx` — 귀국 항공편 자동 채움 (향후 확장)

---

## 2. 사용자 플로우

### 항공권 스캔 (arrival-info.tsx)

```
┌─────────────────────────────────┐
│ ✈️ Flight Information            │
│                                 │
│ ┌─────────────────────────────┐ │
│ │  📷 Scan Boarding Pass /    │ │
│ │     Booking Confirmation    │ │
│ │                             │ │
│ │  Upload a screenshot and    │ │
│ │  AI will fill in the fields │ │
│ └─────────────────────────────┘ │
│                                 │
│ ── or fill manually ──         │
│                                 │
│ Flight Number  [ KE082      ]  │
│ Airline        [ Korean Air ]  │
│ Date           [ 2026-03-15 ]  │
│ Time           [ 10:30 AM   ]  │
│ Terminal       [ Terminal 1 ]  │
│ Passengers     [ 1          ]  │
└─────────────────────────────────┘
```

**플로우:**
1. 환자가 "📷 Scan Boarding Pass" 탭
2. 카메라 촬영 또는 갤러리에서 사진 선택 (expo-image-picker, 이미 설치됨)
3. 로딩 표시: "🤖 AI is reading your booking..."
4. Claude API가 이미지 분석 → JSON 반환
5. 결과를 각 입력 필드에 자동 채움
6. 환자가 확인/수정 후 제출

---

## 3. 기술 구현

### 3-A. Claude API 호출 함수 (`lib/aiScanner.ts` 신규)

```typescript
import * as FileSystem from "expo-file-system";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || "";

export interface FlightInfo {
  flightNumber: string;
  airline: string;
  departureDate: string;     // YYYY-MM-DD
  departureTime: string;     // HH:MM AM/PM
  departureAirport: string;  // JFK, LAX 등
  arrivalDate: string;
  arrivalTime: string;
  arrivalAirport: string;    // ICN, GMP 등
  terminal: string;
  passengers: number;
  confirmationCode: string;
}

export interface HotelInfo {
  hotelName: string;
  address: string;
  checkInDate: string;       // YYYY-MM-DD
  checkOutDate: string;
  nights: number;
  confirmationCode: string;
  roomType: string;
}

export async function scanFlightDocument(imageUri: string): Promise<FlightInfo | null> {
  try {
    // 이미지를 base64로 변환
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 이미지 MIME 타입 판별
    const isJpeg = imageUri.toLowerCase().includes(".jpg") || imageUri.toLowerCase().includes(".jpeg");
    const mediaType = isJpeg ? "image/jpeg" : "image/png";

    const response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64,
                },
              },
              {
                type: "text",
                text: `This is a flight booking confirmation, boarding pass, or airline ticket screenshot.
Extract the following information and return ONLY a JSON object (no markdown, no explanation):
{
  "flightNumber": "e.g. KE082",
  "airline": "e.g. Korean Air",
  "departureDate": "YYYY-MM-DD",
  "departureTime": "HH:MM AM/PM",
  "departureAirport": "airport code e.g. JFK",
  "arrivalDate": "YYYY-MM-DD",
  "arrivalTime": "HH:MM AM/PM (local time)",
  "arrivalAirport": "airport code e.g. ICN",
  "terminal": "e.g. Terminal 1",
  "passengers": 1,
  "confirmationCode": "booking reference"
}
If any field is not visible, use empty string or 0. Return ONLY the JSON.`,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean) as FlightInfo;
  } catch (error) {
    console.error("AI scan error:", error);
    return null;
  }
}

export async function scanHotelDocument(imageUri: string): Promise<HotelInfo | null> {
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const isJpeg = imageUri.toLowerCase().includes(".jpg") || imageUri.toLowerCase().includes(".jpeg");
    const mediaType = isJpeg ? "image/jpeg" : "image/png";

    const response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64,
                },
              },
              {
                type: "text",
                text: `This is a hotel booking confirmation screenshot.
Extract the following information and return ONLY a JSON object (no markdown, no explanation):
{
  "hotelName": "e.g. Lotte Hotel Seoul",
  "address": "full address",
  "checkInDate": "YYYY-MM-DD",
  "checkOutDate": "YYYY-MM-DD",
  "nights": 0,
  "confirmationCode": "booking reference",
  "roomType": "e.g. Deluxe Double"
}
If any field is not visible, use empty string or 0. Return ONLY the JSON.`,
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean) as HotelInfo;
  } catch (error) {
    console.error("AI scan error:", error);
    return null;
  }
}
```

### 3-B. arrival-info.tsx 수정사항

#### import 추가
```typescript
import * as ImagePicker from "expo-image-picker";
import { scanFlightDocument, FlightInfo } from "../../lib/aiScanner";
```

#### state 추가
```typescript
const [scanning, setScanning] = useState(false);
const [scanSuccess, setScanSuccess] = useState(false);
```

#### 스캔 함수
```typescript
const handleScanFlight = async () => {
  // 갤러리에서 이미지 선택
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });

  if (result.canceled || !result.assets?.[0]) return;

  setScanning(true);
  setScanSuccess(false);

  const info = await scanFlightDocument(result.assets[0].uri);

  if (info) {
    // 필드 자동 채움
    if (info.flightNumber) setFlightNumber(info.flightNumber);
    if (info.airline) setAirline(info.airline);
    if (info.arrivalDate) setArrivalDate(info.arrivalDate);
    if (info.arrivalTime) setArrivalTime(info.arrivalTime);
    if (info.terminal) setTerminal(info.terminal);
    if (info.passengers) setPassengers(String(info.passengers));
    setScanSuccess(true);

    // 3초 후 성공 표시 제거
    setTimeout(() => setScanSuccess(false), 3000);
  } else {
    Alert.alert(
      "Scan Failed",
      "Couldn't read the document. Please fill in manually or try another image."
    );
  }

  setScanning(false);
};
```

#### UI — 스캔 버튼 (폼 최상단에 추가)
```tsx
{/* AI Scanner */}
<TouchableOpacity
  style={s.scanButton}
  onPress={handleScanFlight}
  disabled={scanning}
  activeOpacity={0.8}
>
  {scanning ? (
    <View style={s.scanningRow}>
      <ActivityIndicator size="small" color={T.teal} />
      <Text style={s.scanningText}>🤖 AI is reading your booking...</Text>
    </View>
  ) : scanSuccess ? (
    <View style={s.scanningRow}>
      <Text style={s.scanSuccessText}>✅ Fields auto-filled! Review below.</Text>
    </View>
  ) : (
    <>
      <Text style={s.scanIcon}>📷</Text>
      <View>
        <Text style={s.scanTitle}>Scan Booking Confirmation</Text>
        <Text style={s.scanSub}>Upload a screenshot — AI fills the form</Text>
      </View>
    </>
  )}
</TouchableOpacity>

<View style={s.orDivider}>
  <View style={s.orLine} />
  <Text style={s.orText}>or fill manually</Text>
  <View style={s.orLine} />
</View>
```

#### 추가 스타일
```typescript
scanButton: {
  flexDirection: "row",
  alignItems: "center",
  gap: 14,
  backgroundColor: T.tealLight,
  borderRadius: 14,
  padding: 18,
  borderWidth: 1.5,
  borderColor: T.teal,
  borderStyle: "dashed",
},
scanIcon: {
  fontSize: 32,
},
scanTitle: {
  fontSize: 15,
  fontWeight: "700",
  color: T.navy,
},
scanSub: {
  fontSize: 12,
  color: T.slate,
  marginTop: 2,
},
scanningRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  flex: 1,
  justifyContent: "center",
},
scanningText: {
  fontSize: 14,
  color: T.teal,
  fontWeight: "600",
},
scanSuccessText: {
  fontSize: 14,
  color: "#16a34a",
  fontWeight: "600",
},
orDivider: {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  marginVertical: 16,
},
orLine: {
  flex: 1,
  height: 1,
  backgroundColor: T.border,
},
orText: {
  fontSize: 12,
  color: T.slateLight,
},
```

---

## 4. 환경 변수 설정

### app.json (또는 .env)
```json
{
  "expo": {
    "extra": {
      "anthropicApiKey": "sk-ant-..."
    }
  }
}
```

또는 `.env` 파일:
```
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...
```

⚠️ **보안 참고**: 프로덕션에서는 API 키를 클라이언트에 넣으면 안 돼요.
백엔드를 경유해야 해요:
```
앱 → 백엔드 (이미지 전송) → Claude API → 백엔드 (결과 반환) → 앱
```

데모/파일럿 단계에서는 클라이언트에서 직접 호출해도 괜찮아요.
백엔드 연동할 때 `POST /api/ai/scan-flight` 엔드포인트로 옮기면 돼요.

---

## 5. 비용 예측

Claude Sonnet 이미지 분석:
- 이미지 1장당 약 $0.003~0.01 (해상도에 따라)
- 텍스트 응답 약 $0.001
- **건당 약 $0.01 이하**

월 100명 환자 × 항공권 1장 + 호텔 1장 = 200건
→ **월 $2 이하**. 비용 무시 가능.

---

## 6. 확장 가능한 문서 타입

현재 구현:
- ✅ 항공권 / 보딩패스 / 예약 확인서
- ✅ 호텔 예약 확인서

향후 추가 가능:
- 🔜 여행 보험 증서 → 보험사, 보장 내역, 기간 추출
- 🔜 비자 / K-ETA 확인서 → 유효기간, 허가번호 추출
- 🔜 치과 X-ray → AI 초기 분석 (치아 상태 요약) — 의사 참고용
- 🔜 기존 치료 기록서 → 이전 치료 내역 자동 정리

---

## 7. 에러 핸들링

```typescript
// 네트워크 에러
if (!response.ok) {
  throw new Error("API request failed");
}

// JSON 파싱 에러 (AI가 이상한 형식 반환)
try {
  return JSON.parse(clean);
} catch {
  // 재시도 1회
  // 그래도 실패하면 null 반환 → "수동 입력해주세요" 안내
}

// 이미지가 항공권/호텔이 아닌 경우
// Claude가 빈 필드를 반환 → 필드가 거의 비어있으면
// "이 이미지에서 정보를 찾을 수 없습니다" 안내
```

---

## 8. 수정 파일 요약

| 파일 | 작업 |
|------|------|
| `lib/aiScanner.ts` | **신규** — scanFlightDocument, scanHotelDocument 함수 |
| `app/patient/arrival-info.tsx` | 스캔 버튼 + handleScanFlight + 자동 채움 로직 |
| `app/patient/departure-pickup.tsx` | 동일한 스캔 기능 (귀국편용, 향후) |
| `.env` | EXPO_PUBLIC_ANTHROPIC_API_KEY 추가 |

---

## 9. 참고: 현재 arrival-info.tsx 필드 매핑

| AI 추출 필드 | → 앱 state | → store ArrivalInfo |
|-------------|-----------|-------------------|
| flightNumber | setFlightNumber | flightNumber |
| airline | setAirline | airline |
| arrivalDate | setArrivalDate | arrivalDate |
| arrivalTime | setArrivalTime | arrivalTime |
| terminal | setTerminal | terminal |
| passengers | setPassengers | passengers |
| confirmationCode | (신규 필드 추가 가능) | (향후) |
