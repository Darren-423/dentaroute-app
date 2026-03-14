// ══════════════════════════════════════════
//  DentaRoute Chat Contact Filter
//  예약 확정 전까지 연락처 공유 차단 (Airbnb 모델)
// ══════════════════════════════════════════

import { store } from "./store";

// ── 타입 ──

export interface FilterResult {
  blocked: boolean;
  filteredText: string;
  detectedTypes: DetectedType[];
  warningLevel: 1 | 2 | 3;
  warningMessage: string;
}

type DetectedType = "phone" | "email" | "messenger" | "url" | "evasion";

// ── 예약 확정 이후 상태 (필터 해제) ──

const FILTER_OFF_STATUSES = new Set([
  "confirmed",
  "flight_submitted",
  "arrived_korea",
  "checked_in_clinic",
  "treatment_done",
  "between_visits",
  "returning_home",
  "payment_complete",
  "departure_set",
]);

// ── 감지 패턴 ──

// 가격/날짜/치아번호 등 허용 숫자를 먼저 제거한 후 검사
const SAFE_NUMBER_PATTERNS = [
  /[$₩€£¥]\s*[\d,]+(\.\d+)?/g,            // $4,150  ₩5,000,000
  /[\d,]+(\.\d+)?\s*[$₩€£¥]/g,            // 4,150$
  /\d{4}[-/]\d{1,2}[-/]\d{1,2}/g,         // 2026-03-15
  /\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/g,       // 3/15/2026
  /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\.?\s+\d{1,2}/gi, // March 15
  /\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*/gi,    // 15 March
  /#\d{1,2}/g,                              // #14 (치아 번호)
  /\d+\s*(implants?|crowns?|veneers?|teeth|days?|months?|weeks?|years?|hours?|minutes?|visits?|mm|mg|ml|sessions?)/gi,
  /(implants?|crowns?|veneers?|visit|session)\s*\d+/gi,
];

const PHONE_PATTERNS: RegExp[] = [
  /\b0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}\b/,
  /\+\d{1,3}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/,
  /\b\d{3}[-.\s]\d{3,4}[-.\s]\d{4}\b/,
];

const EMAIL_PATTERNS: RegExp[] = [
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  /[a-zA-Z0-9._%+-]+\s*\[at\]\s*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i,
  /[a-zA-Z0-9._%+-]+\s*\(at\)\s*[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i,
];

const MESSENGER_KEYWORDS: string[] = [
  "카카오", "카톡", "카카오톡", "라인", "위챗",
  "kakao", "kakaotalk", "whatsapp", "wechat",
  "telegram", "viber", "signal",
];

const MESSENGER_PHRASE_PATTERNS: RegExp[] = [
  /\b(add|contact|reach|text|call|message)\s+me\b/i,
  /\bmy\s+(id|number|phone|cell|mobile|kakao|line|whatsapp)\b/i,
  /\b(id|아이디)\s*(는|은|:)\s*/i,
];

const URL_PATTERNS: RegExp[] = [
  /https?:\/\/[^\s]+/,
  /www\.[^\s]+/,
  /[a-zA-Z0-9-]+\.(com|net|org|kr|co\.kr|io|me)\b/,
];

const EVASION_PATTERNS: RegExp[] = [
  /(\d\s*[.\-_/\\|,]\s*){7,}/,
  /공\s*일\s*공/,
  /영\s*일\s*영/,
  /zero[\s\-]*one[\s\-]*zero/i,
];

// ── 마스킹 태그 ──
const MASK = "[contact info hidden]";

// ── 경고 메시지 ──
const WARNINGS: Record<1 | 2 | 3, string> = {
  1: "For your protection, personal contact information cannot be shared before booking confirmation. All communication should stay within DentaRoute.",
  2: "Contact sharing is restricted to protect both parties. Once your booking is confirmed, you'll be able to share contact details directly.",
  3: "Repeated attempts to share contact information have been detected. This activity is logged. Please use DentaRoute's secure messaging.",
};

// ── 위반 카운트 (세션 메모리) ──
const violationCounts: Record<string, number> = {};

function getViolationCount(chatRoomId: string): number {
  return violationCounts[chatRoomId] || 0;
}

function incrementViolation(chatRoomId: string): number {
  violationCounts[chatRoomId] = (violationCounts[chatRoomId] || 0) + 1;
  return violationCounts[chatRoomId];
}

export function resetViolations(chatRoomId: string): void {
  delete violationCounts[chatRoomId];
}

// ── 안전한 숫자 제거 (가격, 날짜 등을 placeholder로 교체) ──
function removeSafeNumbers(text: string): string {
  let cleaned = text;
  for (const pattern of SAFE_NUMBER_PATTERNS) {
    cleaned = cleaned.replace(pattern, "___SAFE___");
  }
  return cleaned;
}

// ── 패턴 감지 ──
function detectPatterns(text: string): { types: DetectedType[]; matches: { start: number; end: number }[] } {
  const types = new Set<DetectedType>();
  const matches: { start: number; end: number }[] = [];

  // 안전한 숫자를 제거한 텍스트로 전화번호 검사
  const cleanedForPhone = removeSafeNumbers(text);

  // 전화번호 (안전한 숫자 제거 후 검사)
  for (const pattern of PHONE_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags + (pattern.flags.includes("g") ? "" : "g"));
    let match;
    while ((match = regex.exec(cleanedForPhone)) !== null) {
      types.add("phone");
      // 원본 텍스트에서의 대략적 위치 (safe number 치환으로 정확하지 않을 수 있음)
      // 원본 텍스트에서 같은 패턴 다시 검색
      const origRegex = new RegExp(pattern.source, pattern.flags + (pattern.flags.includes("g") ? "" : "g"));
      let origMatch;
      while ((origMatch = origRegex.exec(text)) !== null) {
        matches.push({ start: origMatch.index, end: origMatch.index + origMatch[0].length });
      }
    }
  }

  // 이메일
  for (const pattern of EMAIL_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags + (pattern.flags.includes("g") ? "" : "g"));
    let match;
    while ((match = regex.exec(text)) !== null) {
      types.add("email");
      matches.push({ start: match.index, end: match.index + match[0].length });
    }
  }

  // 메신저 키워드
  const lowerText = text.toLowerCase();
  for (const keyword of MESSENGER_KEYWORDS) {
    const idx = lowerText.indexOf(keyword.toLowerCase());
    if (idx !== -1) {
      types.add("messenger");
      matches.push({ start: idx, end: idx + keyword.length });
    }
  }

  // 메신저 구문 패턴
  for (const pattern of MESSENGER_PHRASE_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags + (pattern.flags.includes("g") ? "" : "g"));
    let match;
    while ((match = regex.exec(text)) !== null) {
      types.add("messenger");
      matches.push({ start: match.index, end: match.index + match[0].length });
    }
  }

  // URL
  for (const pattern of URL_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags + (pattern.flags.includes("g") ? "" : "g"));
    let match;
    while ((match = regex.exec(text)) !== null) {
      types.add("url");
      matches.push({ start: match.index, end: match.index + match[0].length });
    }
  }

  // 우회 시도
  for (const pattern of EVASION_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags + (pattern.flags.includes("g") ? "" : "g"));
    let match;
    while ((match = regex.exec(text)) !== null) {
      types.add("evasion");
      matches.push({ start: match.index, end: match.index + match[0].length });
    }
  }

  return { types: Array.from(types), matches };
}

// ── 텍스트 마스킹 ──
function maskText(text: string, matches: { start: number; end: number }[]): string {
  if (matches.length === 0) return text;

  // 겹치는 범위 병합
  const sorted = [...matches].sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].start <= last.end) {
      last.end = Math.max(last.end, sorted[i].end);
    } else {
      merged.push(sorted[i]);
    }
  }

  // 뒤에서부터 치환 (인덱스 유지)
  let result = text;
  for (let i = merged.length - 1; i >= 0; i--) {
    const { start, end } = merged[i];
    result = result.slice(0, start) + MASK + result.slice(end);
  }
  return result;
}

// ── 메인 필터 함수 ──

export function filterChatMessage(
  text: string,
  chatRoomId: string,
  isBookingConfirmed: boolean,
): FilterResult {
  // 예약 확정 후에는 필터 OFF
  if (isBookingConfirmed) {
    return {
      blocked: false,
      filteredText: text,
      detectedTypes: [],
      warningLevel: 1,
      warningMessage: "",
    };
  }

  const { types, matches } = detectPatterns(text);

  if (types.length === 0) {
    return {
      blocked: false,
      filteredText: text,
      detectedTypes: [],
      warningLevel: 1,
      warningMessage: "",
    };
  }

  // 위반 카운트 증가
  const count = incrementViolation(chatRoomId);
  const warningLevel: 1 | 2 | 3 = count >= 6 ? 3 : count >= 3 ? 2 : 1;

  return {
    blocked: true,
    filteredText: maskText(text, matches),
    detectedTypes: types,
    warningLevel,
    warningMessage: WARNINGS[warningLevel],
  };
}

// ── 예약 상태 체크 헬퍼 ──

export async function checkBookingConfirmed(caseId: string): Promise<boolean> {
  if (!caseId) return false;
  const booking = await store.getBookingForCase(caseId);
  if (!booking) return false;
  return FILTER_OFF_STATUSES.has(booking.status);
}

// ── ChatRoom에서 caseId 가져오기 ──

export async function getCaseIdForChatRoom(chatRoomId: string): Promise<string | null> {
  const rooms = await store.getChatRooms();
  const room = rooms.find((r) => r.id === chatRoomId);
  return room?.caseId || null;
}
