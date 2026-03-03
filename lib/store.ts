import AsyncStorage from "@react-native-async-storage/async-storage";

// ══════════════════════════════════════════
//  DentaRoute Local Data Store
//  Patient와 Doctor가 한 폰에서 quote 주고받기
// ══════════════════════════════════════════

// ── 키 상수 ──
const KEYS = {
  PATIENT_PROFILE: "dr_patient_profile",
  PATIENT_MEDICAL: "dr_patient_medical",
  PATIENT_DENTAL: "dr_patient_dental",
  PATIENT_FILES: "dr_patient_files",
  PATIENT_TREATMENTS: "dr_patient_treatments",
  PATIENT_TRAVEL: "dr_patient_travel",
  CASES: "dr_cases",
  QUOTES: "dr_quotes",
  CURRENT_USER: "dr_current_user",
  CHATS: "dr_chats",
  MESSAGES: "dr_messages",
  BOOKINGS: "dr_bookings",
  REVIEWS: "dr_reviews",
  NOTIFICATIONS: "dr_notifications",
  DOCTOR_PROFILE: "dr_doctor_profile",
  INQUIRIES: "dr_inquiries",
};

// ── 티어 설정 ──
export const TIER_CONFIG = {
  gold:     { feeRate: 0.15, label: "Gold",     color: "#f59e0b" },
  silver:   { feeRate: 0.18, label: "Silver",   color: "#94a3b8" },
  standard: { feeRate: 0.20, label: "Standard", color: "#78716c" },
} as const;
export type DoctorTier = keyof typeof TIER_CONFIG;

// ── 타입 ──
export interface PatientCase {
  id: string;
  patientName: string;
  country: string;
  date: string;
  treatments: { name: string; qty: number }[];
  medicalNotes: string;
  dentalIssues: string[];
  filesCount: { xrays: number; treatmentPlans: number; photos: number };
  status: "pending" | "quotes_received" | "booked";
  visitDate?: string;    // "Within 10 days", "1 month", etc.
  birthDate?: string;    // "1990-05-15" format
}

export interface DentistQuote {
  id: string;
  caseId: string;
  dentistName: string;
  clinicName: string;
  location: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating: number;
  reviewCount: number;
  totalPrice: number;
  treatments: { name: string; qty: number; price: number }[];
  treatmentDetails: string;
  duration: string;
  visits?: { visit: number; description: string; gapMonths?: number; gapDays?: number; paymentAmount?: number; paymentPercent?: number }[];
  message: string;
  createdAt: string;
  clinicPhotos?: string[];
  yearsExperience?: number;
  specialties?: string[];
}

export interface ChatRoom {
  id: string;
  caseId: string;
  patientName: string;
  dentistName: string;
  clinicName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadPatient: number;
  unreadDoctor: number;
}

export interface ChatMessage {
  id: string;
  chatRoomId: string;
  sender: "patient" | "doctor";
  text: string;
  translatedText?: string | null;
  originalLang?: "en" | "ko";
  timestamp: string;
}

export interface VisitDate {
  visit: number;
  description: string;
  date: string;
  confirmedTime?: string;   // patient selects time in visit-schedule
  gapMonths?: number;       // min gap AFTER this visit before next
  gapDays?: number;         // min gap AFTER this visit before next
  paymentAmount?: number;   // amount due at this visit
  paymentPercent?: number;  // OR percentage of total
  paid?: boolean;           // has patient paid for this visit
}

export interface ArrivalInfo {
  flightNumber: string;
  arrivalDate: string;
  arrivalTime: string;
  airline?: string;
  terminal?: string;
  passengers?: number;
  notes?: string;
  pickupRequested: boolean;
}

export interface VisitInvoice {
  visit: number;              // matches VisitDate.visit
  description: string;
  items: { treatment: string; qty: number; price: number }[];
  visitTotal: number;         // sum of NEW items for this visit (no discount applied)
  prevCarryForward: number;   // carry received from previous visit (0 for Visit 1)
  billingPercent: number;     // % of payableBase (visitTotal + prevCarry) billed now
  billedAmount: number;       // (visitTotal + prevCarry) * billingPercent / 100
  deferredAmount: number;     // (visitTotal + prevCarry) - billedAmount
  carryForward: number;       // = deferredAmount (pre-discount amount carried to next visit)
  preDiscountPayment: number; // = billedAmount (before 5% discount)
  appDiscount: number;        // preDiscountPayment * 5% (this visit's discount, hidden from doctor)
  afterDiscount: number;      // preDiscountPayment - appDiscount
  paymentPercent: number;     // legacy (kept for compat, set to 0 in new flow)
  paymentAmount: number;      // patient actual payment (afterDiscount - deposit)
  depositDeducted?: number;   // deposit deducted (Visit 1 only)
  paid: boolean;
  paidAt?: string;
}

export interface FinalInvoice {
  items: { treatment: string; qty: number; price: number }[];  // all items flat (backward compat)
  totalAmount: number;
  appDiscount: number;       // 5% app payment discount
  discountedTotal: number;   // totalAmount - appDiscount
  depositPaid: number;
  balanceDue: number;        // discountedTotal - depositPaid
  notes?: string;
  createdAt: string;
  visitInvoices?: VisitInvoice[];  // per-visit breakdown (optional for backward compat)
}

export interface DeparturePickup {
  pickupLocation: string;
  pickupAddress: string;
  pickupDate: string;
  pickupTime: string;
  flightNumber?: string;
  terminal?: string;
  passengers?: number;
  notes?: string;
  createdAt: string;
}

export interface Booking {
  id: string;
  caseId: string;
  quoteId: string;
  dentistName: string;
  clinicName: string;
  depositPaid: number;
  totalPrice: number;
  treatments?: { name: string; qty: number; price: number }[];  // doctor can modify
  visitDates: VisitDate[];
  arrivalInfo?: ArrivalInfo;
  finalInvoice?: FinalInvoice;
  departurePickup?: DeparturePickup;
  currentVisit?: number;       // 1-based, tracks which visit is active (default 1)
  status: "confirmed" | "flight_submitted" | "arrived_korea" | "checked_in_clinic" | "treatment_done" | "between_visits" | "returning_home" | "payment_complete" | "departure_set" | "cancelled";
  cancelledAt?: string;
  cancelledBy?: "patient" | "doctor";
  cancelReason?: string;
  refundAmount?: number;
  platformFeeRate?: number;  // tier-based: 0.15 (Gold) | 0.18 (Silver) | 0.20 (Standard)
  savedCard?: { last4: string; brand: string; name: string; expiry: string };
  createdAt: string;
}

export interface Review {
  id: string;
  caseId: string;
  bookingId: string;
  dentistName: string;
  clinicName: string;
  patientName: string;
  rating: number;
  treatmentRating: number;
  clinicRating: number;
  communicationRating: number;
  title: string;
  comment: string;
  treatments: string[];
  createdAt: string;
}

export interface AppNotification {
  id: string;
  role: "patient" | "doctor";
  type: "new_quote" | "quote_accepted" | "new_message" | "new_case" | "new_review" | "payment_received" | "reminder" | "system" | "booking_cancelled" | "case_updated";
  title: string;
  body: string;
  icon: string;
  read: boolean;
  route?: string;
  createdAt: string;
}

export interface SupportInquiry {
  id: string;
  category: "booking" | "payment" | "treatment" | "travel" | "technical" | "other";
  subject: string;
  message: string;
  email: string;
  status: "submitted" | "in_review" | "resolved";
  createdAt: string;
  response?: string;
  respondedAt?: string;
}

// ── Mock Translation (데모용, 나중에 DeepL/Google API로 교체) ──
// TODO: 실제 API 교체 시 언어 감지(detection) 로직 추가 필요 (의사가 영어로 쓰는 경우 등)
const mockTranslate = async (text: string, from: "en" | "ko"): Promise<string> => {
  await new Promise((r) => setTimeout(r, 800));
  if (from === "en") {
    const mockMap: Record<string, string> = {
      "hello": "안녕하세요",
      "thank you": "감사합니다",
      "how much": "얼마인가요",
      "appointment": "예약",
      "implant": "임플란트",
      "pain": "통증",
      "recovery": "회복",
      "treatment": "치료",
      "hotel": "호텔",
      "question": "질문",
    };
    const lower = text.toLowerCase();
    for (const [eng, kor] of Object.entries(mockMap)) {
      if (lower.includes(eng)) return text + " → [KO] " + kor;
    }
    return "[KO 번역] " + text;
  } else {
    return "[EN Translation] " + text;
  }
};

// ── Refund 계산 헬퍼 ──
export const getRefundInfo = (booking: Booking): { percent: number; amount: number; tier: "full" | "partial" | "none" } => {
  const firstVisitDate = booking.visitDates?.[0]?.date;
  if (!firstVisitDate) return { percent: 100, amount: booking.depositPaid, tier: "full" };
  const daysUntil = Math.ceil((new Date(firstVisitDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysUntil >= 7) return { percent: 100, amount: booking.depositPaid, tier: "full" };
  if (daysUntil >= 3) return { percent: 50, amount: Math.round(booking.depositPaid * 0.5), tier: "partial" };
  return { percent: 0, amount: 0, tier: "none" };
};

// ── 유저 관리 ──
export const store = {
  // 현재 유저 설정
  setCurrentUser: async (role: "patient" | "doctor", name: string) => {
    await AsyncStorage.setItem(KEYS.CURRENT_USER, JSON.stringify({ role, name }));
  },

  getCurrentUser: async (): Promise<{ role: string; name: string } | null> => {
    const data = await AsyncStorage.getItem(KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },

  clearCurrentUser: async () => {
    await AsyncStorage.removeItem(KEYS.CURRENT_USER);
  },

  // ══════════════════════════
  //  PATIENT 쪽
  // ══════════════════════════

  // 프로필 저장
  savePatientProfile: async (profile: any) => {
    await AsyncStorage.setItem(KEYS.PATIENT_PROFILE, JSON.stringify(profile));
  },

  getPatientProfile: async () => {
    const data = await AsyncStorage.getItem(KEYS.PATIENT_PROFILE);
    return data ? JSON.parse(data) : null;
  },

  // Medical History 저장
  savePatientMedical: async (medical: any) => {
    await AsyncStorage.setItem(KEYS.PATIENT_MEDICAL, JSON.stringify(medical));
  },

  getPatientMedical: async () => {
    const data = await AsyncStorage.getItem(KEYS.PATIENT_MEDICAL);
    return data ? JSON.parse(data) : null;
  },

  // Dental History 저장
  savePatientDental: async (dental: any) => {
    await AsyncStorage.setItem(KEYS.PATIENT_DENTAL, JSON.stringify(dental));
  },

  getPatientDental: async () => {
    const data = await AsyncStorage.getItem(KEYS.PATIENT_DENTAL);
    return data ? JSON.parse(data) : null;
  },

  // 파일 저장 (URI 배열)
  savePatientFiles: async (files: { xrays: string[]; treatmentPlans: string[]; photos: string[] }) => {
    await AsyncStorage.setItem(KEYS.PATIENT_FILES, JSON.stringify(files));
  },

  getPatientFiles: async (): Promise<{ xrays: string[]; treatmentPlans: string[]; photos: string[] } | null> => {
    const data = await AsyncStorage.getItem(KEYS.PATIENT_FILES);
    return data ? JSON.parse(data) : null;
  },

  // 선택한 Treatments 저장
  savePatientTreatments: async (treatments: any) => {
    await AsyncStorage.setItem(KEYS.PATIENT_TREATMENTS, JSON.stringify(treatments));
  },

  getPatientTreatments: async () => {
    const data = await AsyncStorage.getItem(KEYS.PATIENT_TREATMENTS);
    return data ? JSON.parse(data) : null;
  },

  // Travel Dates 저장
  savePatientTravel: async (travel: any) => {
    await AsyncStorage.setItem(KEYS.PATIENT_TRAVEL, JSON.stringify(travel));
  },

  getPatientTravel: async () => {
    const data = await AsyncStorage.getItem(KEYS.PATIENT_TRAVEL);
    return data ? JSON.parse(data) : null;
  },

  // ── Doctor Profile ──
  saveDoctorProfile: async (profile: any) => {
    await AsyncStorage.setItem(KEYS.DOCTOR_PROFILE, JSON.stringify(profile));
  },

  getDoctorProfile: async () => {
    const data = await AsyncStorage.getItem(KEYS.DOCTOR_PROFILE);
    return data ? JSON.parse(data) : null;
  },

  // ── 케이스 관리 ──
  createCase: async (caseData: Omit<PatientCase, "id" | "date" | "status">): Promise<PatientCase> => {
    const cases = await store.getCases();
    const newCase: PatientCase = {
      ...caseData,
      id: String(1001 + cases.length),
      date: new Date().toISOString().split("T")[0],
      status: "pending",
    };
    cases.push(newCase);
    await AsyncStorage.setItem(KEYS.CASES, JSON.stringify(cases));

    // 의사에게 알림
    await store.addNotification({
      role: "doctor",
      type: "new_case",
      title: "🆕 New Patient Case",
      body: `${caseData.patientName} from ${caseData.country} submitted a new case with ${caseData.treatments?.length || 0} treatments.`,
      icon: "🆕",
    });

    return newCase;
  },

  getCases: async (): Promise<PatientCase[]> => {
    const data = await AsyncStorage.getItem(KEYS.CASES);
    return data ? JSON.parse(data) : [];
  },

  getCase: async (caseId: string): Promise<PatientCase | null> => {
    const cases = await store.getCases();
    return cases.find((c) => c.id === caseId) || null;
  },

  updateCaseStatus: async (caseId: string, status: PatientCase["status"]) => {
    const cases = await store.getCases();
    const idx = cases.findIndex((c) => c.id === caseId);
    if (idx !== -1) {
      cases[idx].status = status;
      await AsyncStorage.setItem(KEYS.CASES, JSON.stringify(cases));
    }
  },

  updateCase: async (caseId: string, updates: Partial<PatientCase>): Promise<void> => {
    const cases = await store.getCases();
    const idx = cases.findIndex((c) => c.id === caseId);
    if (idx >= 0) {
      cases[idx] = { ...cases[idx], ...updates };
      await AsyncStorage.setItem(KEYS.CASES, JSON.stringify(cases));
    }
  },

  /** 프로필 변경 시 pending/quotes_received 케이스 일괄 업데이트 + 의사 알림 */
  updateCasesForProfile: async (): Promise<number> => {
    const [profile, medical, dental, cases] = await Promise.all([
      store.getPatientProfile(),
      store.getPatientMedical(),
      store.getPatientDental(),
      store.getCases(),
    ]);

    const eligible = cases.filter((c) => c.status === "pending" || c.status === "quotes_received");
    if (eligible.length === 0) return 0;

    const patientName = profile?.fullName || profile?.name || "Patient";
    const country = profile?.country || "USA";
    const birthDate = profile?.birthDate;
    const medicalNotes = medical ? JSON.stringify(medical) : "";
    const dentalIssues: string[] = dental?.issues || [];

    for (const c of eligible) {
      c.patientName = patientName;
      c.country = country;
      if (birthDate) c.birthDate = birthDate;
      c.medicalNotes = medicalNotes;
      c.dentalIssues = dentalIssues;
    }

    await AsyncStorage.setItem(KEYS.CASES, JSON.stringify(cases));

    for (const c of eligible) {
      await store.addNotification({
        role: "doctor",
        type: "case_updated",
        title: "Patient Info Updated",
        body: `${patientName} updated their profile for Case #${c.id}.`,
        icon: "📝",
        route: `/doctor/case-detail?caseId=${c.id}`,
      });
    }

    return eligible.length;
  },

  // ══════════════════════════
  //  DOCTOR 쪽
  // ══════════════════════════

  // 견적 보내기
  createQuote: async (quoteData: Omit<DentistQuote, "id" | "createdAt">): Promise<DentistQuote> => {
    const quotes = await store.getQuotes();
    const newQuote: DentistQuote = {
      ...quoteData,
      id: "q" + String(Date.now()).slice(-6),
      createdAt: new Date().toISOString(),
    };
    quotes.push(newQuote);
    await AsyncStorage.setItem(KEYS.QUOTES, JSON.stringify(quotes));

    // 케이스 상태 업데이트
    await store.updateCaseStatus(quoteData.caseId, "quotes_received");

    // 환자에게 알림
    await store.addNotification({
      role: "patient",
      type: "new_quote",
      title: "💬 New Quote Received!",
      body: `${quoteData.dentistName} from ${quoteData.clinicName} sent you a quote for $${quoteData.totalPrice.toLocaleString()}.`,
      icon: "💬",
      route: `/patient/quotes?caseId=${quoteData.caseId}`,
    });

    return newQuote;
  },

  // 특정 케이스의 견적 가져오기
  getQuotesForCase: async (caseId: string): Promise<DentistQuote[]> => {
    const quotes = await store.getQuotes();
    return quotes.filter((q) => q.caseId === caseId);
  },

  // 모든 견적
  getQuotes: async (): Promise<DentistQuote[]> => {
    const data = await AsyncStorage.getItem(KEYS.QUOTES);
    return data ? JSON.parse(data) : [];
  },

  // ══════════════════════════
  //  CHAT 기능
  // ══════════════════════════

  // 채팅방 만들기 (or 기존 반환)
  getOrCreateChatRoom: async (caseId: string, patientName: string, dentistName: string, clinicName: string): Promise<ChatRoom> => {
    const rooms = await store.getChatRooms();
    const existing = rooms.find((r) => r.caseId === caseId && r.dentistName === dentistName);
    if (existing) return existing;

    const newRoom: ChatRoom = {
      id: "chat_" + String(Date.now()).slice(-6),
      caseId,
      patientName,
      dentistName,
      clinicName,
      lastMessage: "",
      lastMessageAt: new Date().toISOString(),
      unreadPatient: 0,
      unreadDoctor: 0,
    };
    rooms.push(newRoom);
    await AsyncStorage.setItem(KEYS.CHATS, JSON.stringify(rooms));
    return newRoom;
  },

  getChatRooms: async (): Promise<ChatRoom[]> => {
    const data = await AsyncStorage.getItem(KEYS.CHATS);
    return data ? JSON.parse(data) : [];
  },

  getChatRoomsForUser: async (role: "patient" | "doctor", name: string): Promise<ChatRoom[]> => {
    const rooms = await store.getChatRooms();
    if (role === "patient") return rooms.filter((r) => r.patientName === name);
    return rooms.filter((r) => r.dentistName === name);
  },

  // 메시지 보내기
  sendMessage: async (chatRoomId: string, sender: "patient" | "doctor", text: string): Promise<ChatMessage> => {
    const allMessages = await store.getMessages(chatRoomId);
    const originalLang = sender === "patient" ? "en" : "ko";
    const msg: ChatMessage = {
      id: "msg_" + String(Date.now()).slice(-8),
      chatRoomId,
      sender,
      text,
      originalLang,
      translatedText: null,
      timestamp: new Date().toISOString(),
    };
    allMessages.push(msg);
    await AsyncStorage.setItem(KEYS.MESSAGES + "_" + chatRoomId, JSON.stringify(allMessages));

    // 채팅방 lastMessage 업데이트
    const rooms = await store.getChatRooms();
    const idx = rooms.findIndex((r) => r.id === chatRoomId);
    if (idx !== -1) {
      rooms[idx].lastMessage = text;
      rooms[idx].lastMessageAt = msg.timestamp;
      if (sender === "patient") rooms[idx].unreadDoctor += 1;
      else rooms[idx].unreadPatient += 1;
      await AsyncStorage.setItem(KEYS.CHATS, JSON.stringify(rooms));
    }

    return msg;
  },

  getMessages: async (chatRoomId: string): Promise<ChatMessage[]> => {
    const data = await AsyncStorage.getItem(KEYS.MESSAGES + "_" + chatRoomId);
    return data ? JSON.parse(data) : [];
  },

  // 메시지 번역 일괄 실행 (병렬 번역 후 한 번에 저장 — lost-update 방지)
  // 반환: { [messageId]: translatedText | null } (null이면 실패)
  translateMessages: async (chatRoomId: string, messageIds: string[]): Promise<Record<string, string | null>> => {
    const allMessages = await store.getMessages(chatRoomId);
    const targets = messageIds
      .map((id) => ({ id, idx: allMessages.findIndex((m) => m.id === id) }))
      .filter(({ idx }) => idx !== -1 && !allMessages[idx].translatedText);

    if (targets.length === 0) return {};

    // 병렬로 번역 API 호출 (네트워크만 병렬, 저장은 아래에서 한 번에)
    const translations = await Promise.allSettled(
      targets.map(({ idx }) => mockTranslate(allMessages[idx].text, allMessages[idx].originalLang || "en"))
    );

    const results: Record<string, string | null> = {};
    translations.forEach((result, i) => {
      const { id, idx } = targets[i];
      if (result.status === "fulfilled") {
        allMessages[idx].translatedText = result.value;
        results[id] = result.value;
      } else {
        results[id] = null;
      }
    });

    // 한 번에 저장 — 여러 메시지 번역 결과가 동시에 반영됨
    await AsyncStorage.setItem(KEYS.MESSAGES + "_" + chatRoomId, JSON.stringify(allMessages));
    return results;
  },

  markAsRead: async (chatRoomId: string, role: "patient" | "doctor") => {
    const rooms = await store.getChatRooms();
    const idx = rooms.findIndex((r) => r.id === chatRoomId);
    if (idx !== -1) {
      if (role === "patient") rooms[idx].unreadPatient = 0;
      else rooms[idx].unreadDoctor = 0;
      await AsyncStorage.setItem(KEYS.CHATS, JSON.stringify(rooms));
    }
  },

  // ══════════════════════════
  //  유틸
  // ══════════════════════════

  // 전체 데이터 리셋 (개발용)
  resetAll: async () => {
    const keys = Object.values(KEYS);
    await AsyncStorage.multiRemove(keys);
  },

  // 디버그: 전체 데이터 출력
  debugAll: async () => {
    const result: any = {};
    for (const [key, storageKey] of Object.entries(KEYS)) {
      const data = await AsyncStorage.getItem(storageKey);
      result[key] = data ? JSON.parse(data) : null;
    }
    console.log("=== DentaRoute Store ===", JSON.stringify(result, null, 2));
    return result;
  },

  // ── Booking 관리 ──
  createBooking: async (data: Omit<Booking, "id" | "createdAt">): Promise<Booking> => {
    const existing = await AsyncStorage.getItem(KEYS.BOOKINGS);
    const bookings: Booking[] = existing ? JSON.parse(existing) : [];
    const booking: Booking = {
      ...data,
      id: `bk_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    bookings.push(booking);
    await AsyncStorage.setItem(KEYS.BOOKINGS, JSON.stringify(bookings));
    return booking;
  },

  getBookings: async (): Promise<Booking[]> => {
    const data = await AsyncStorage.getItem(KEYS.BOOKINGS);
    return data ? JSON.parse(data) : [];
  },

  getBooking: async (bookingId: string): Promise<Booking | null> => {
    const bookings = await store.getBookings();
    return bookings.find((b) => b.id === bookingId) || null;
  },

  getBookingForCase: async (caseId: string): Promise<Booking | null> => {
    const bookings = await store.getBookings();
    // Prefer non-cancelled booking so dashboard routes correctly
    return bookings.find((b) => b.caseId === caseId && b.status !== "cancelled")
      || bookings.find((b) => b.caseId === caseId)
      || null;
  },

  updateBooking: async (bookingId: string, updates: Partial<Booking>): Promise<void> => {
    const existing = await AsyncStorage.getItem(KEYS.BOOKINGS);
    const bookings: Booking[] = existing ? JSON.parse(existing) : [];
    const idx = bookings.findIndex((b) => b.id === bookingId);
    if (idx >= 0) {
      bookings[idx] = { ...bookings[idx], ...updates };
      await AsyncStorage.setItem(KEYS.BOOKINGS, JSON.stringify(bookings));
    }
  },

  // ── Booking 취소 ──
  cancelBooking: async (bookingId: string, reason?: string): Promise<Booking | null> => {
    const existing = await AsyncStorage.getItem(KEYS.BOOKINGS);
    const bookings: Booking[] = existing ? JSON.parse(existing) : [];
    const idx = bookings.findIndex((b) => b.id === bookingId);
    if (idx < 0) return null;

    const bk = bookings[idx];
    const refund = getRefundInfo(bk);

    bk.status = "cancelled";
    bk.cancelledAt = new Date().toISOString();
    bk.cancelledBy = "patient";
    bk.cancelReason = reason || "No reason provided";
    bk.refundAmount = refund.amount;

    bookings[idx] = bk;
    await AsyncStorage.setItem(KEYS.BOOKINGS, JSON.stringify(bookings));

    // 환자 알림
    await store.addNotification({
      role: "patient",
      type: "booking_cancelled",
      title: "Booking Cancelled",
      body: refund.amount > 0
        ? `Your booking with ${bk.clinicName} has been cancelled. $${refund.amount} will be refunded.`
        : `Your booking with ${bk.clinicName} has been cancelled. No refund is applicable.`,
      icon: "❌",
      route: `/patient/quotes?caseId=${bk.caseId}`,
    });

    // 의사 알림
    await store.addNotification({
      role: "doctor",
      type: "booking_cancelled",
      title: "Booking Cancelled",
      body: `Patient cancelled their booking for Case #${bk.caseId}. Reason: ${reason || "Not specified"}`,
      icon: "❌",
      route: `/doctor/case-detail?caseId=${bk.caseId}`,
    });

    return bk;
  },

  // ── Review 관리 ──
  createReview: async (data: Omit<Review, "id" | "createdAt">): Promise<Review> => {
    const existing = await AsyncStorage.getItem(KEYS.REVIEWS);
    const reviews: Review[] = existing ? JSON.parse(existing) : [];
    const review: Review = { ...data, id: `rev_${Date.now()}`, createdAt: new Date().toISOString() };
    reviews.push(review);
    await AsyncStorage.setItem(KEYS.REVIEWS, JSON.stringify(reviews));
    return review;
  },

  getReviews: async (): Promise<Review[]> => {
    const data = await AsyncStorage.getItem(KEYS.REVIEWS);
    return data ? JSON.parse(data) : [];
  },

  getReviewsForDentist: async (dentistName: string): Promise<Review[]> => {
    const reviews = await store.getReviews();
    return reviews.filter((r) => r.dentistName === dentistName);
  },

  getReviewForBooking: async (bookingId: string): Promise<Review | null> => {
    const reviews = await store.getReviews();
    return reviews.find((r) => r.bookingId === bookingId) || null;
  },

  // ── Notification 관리 ──
  addNotification: async (data: Omit<AppNotification, "id" | "createdAt" | "read">): Promise<void> => {
    const existing = await AsyncStorage.getItem(KEYS.NOTIFICATIONS);
    const notifs: AppNotification[] = existing ? JSON.parse(existing) : [];
    notifs.unshift({ ...data, id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, read: false, createdAt: new Date().toISOString() });
    await AsyncStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifs));
  },

  getNotifications: async (role?: "patient" | "doctor"): Promise<AppNotification[]> => {
    const data = await AsyncStorage.getItem(KEYS.NOTIFICATIONS);
    const notifs: AppNotification[] = data ? JSON.parse(data) : [];
    return role ? notifs.filter((n) => n.role === role) : notifs;
  },

  getUnreadCount: async (role: "patient" | "doctor"): Promise<number> => {
    const notifs = await store.getNotifications(role);
    return notifs.filter((n) => !n.read).length;
  },

  markNotificationRead: async (notifId: string): Promise<void> => {
    const existing = await AsyncStorage.getItem(KEYS.NOTIFICATIONS);
    const notifs: AppNotification[] = existing ? JSON.parse(existing) : [];
    const idx = notifs.findIndex((n) => n.id === notifId);
    if (idx >= 0) { notifs[idx].read = true; await AsyncStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifs)); }
  },

  markAllNotificationsRead: async (role: "patient" | "doctor"): Promise<void> => {
    const existing = await AsyncStorage.getItem(KEYS.NOTIFICATIONS);
    const notifs: AppNotification[] = existing ? JSON.parse(existing) : [];
    notifs.forEach((n) => { if (n.role === role) n.read = true; });
    await AsyncStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(notifs));
  },

  // ── Support Inquiries ──
  submitInquiry: async (data: Omit<SupportInquiry, "id" | "status" | "createdAt">): Promise<SupportInquiry> => {
    const existing = await AsyncStorage.getItem(KEYS.INQUIRIES);
    const inquiries: SupportInquiry[] = existing ? JSON.parse(existing) : [];
    const inquiry: SupportInquiry = {
      ...data,
      id: "inq_" + String(Date.now()).slice(-8),
      status: "submitted",
      createdAt: new Date().toISOString(),
    };
    inquiries.unshift(inquiry);
    await AsyncStorage.setItem(KEYS.INQUIRIES, JSON.stringify(inquiries));

    await store.addNotification({
      role: "patient",
      type: "system",
      title: "📩 Inquiry Received",
      body: `Your inquiry about "${data.subject}" has been submitted. We'll respond within 24 hours.`,
      icon: "📩",
      route: "/patient/help-center",
    });

    return inquiry;
  },

  getInquiries: async (): Promise<SupportInquiry[]> => {
    const data = await AsyncStorage.getItem(KEYS.INQUIRIES);
    return data ? JSON.parse(data) : [];
  },

  // ══════════════════════════
  //  데모 시드 데이터
  // ══════════════════════════
  seedDemoData: async () => {
    // 1. Patient Profile
    await AsyncStorage.setItem(KEYS.PATIENT_PROFILE, JSON.stringify({
      fullName: "Sarah Johnson",
      email: "sarah.johnson@email.com",
      phone: "+1 (555) 123-4567",
      country: "United States",
      birthDate: "1990-05-15",
      language: "English",
    }));

    // 2. Doctor Profile
    await AsyncStorage.setItem(KEYS.DOCTOR_PROFILE, JSON.stringify({
      fullName: "Dr. Kim Minjun",
      clinicName: "Seoul Bright Dental",
      location: "Gangnam, Seoul",
      address: "123 Teheran-ro, Gangnam-gu, Seoul",
      specialty: "Implant Specialist",
      experience: 12,
      bio: "Board-certified implant specialist with over 12 years of experience.",
      email: "dr.kim@seoulbrightdental.com",
      phone: "+82 2-555-1234",
      website: "https://seoulbrightdental.com",
      license: "KDA-2012-4567",
      rating: 4.9,
      reviewCount: 127,
      latitude: 37.5012,
      longitude: 127.0396,
      tier: "standard",
      platformFeeRate: 0.20,
      tierUpdatedAt: new Date().toISOString(),
    }));

    // 3. Medical History
    await AsyncStorage.setItem(KEYS.PATIENT_MEDICAL, JSON.stringify({
      conditions: ["None"],
      medications: "",
      allergies: "None",
    }));

    // 3. Dental History
    await AsyncStorage.setItem(KEYS.PATIENT_DENTAL, JSON.stringify({
      issues: ["Missing Teeth", "Discoloration"],
      previousTreatments: "Had a filling 2 years ago",
      lastVisit: "6-12 months",
    }));

    // 4. Travel Dates
    await AsyncStorage.setItem(KEYS.PATIENT_TRAVEL, JSON.stringify({
      scheduleType: "fixed",
      arrivalDate: "2026-03-15",
      departureDate: "2026-03-22",
      tripDays: 7,
    }));

    // 5. Files (mock counts)
    await AsyncStorage.setItem(KEYS.PATIENT_FILES, JSON.stringify({
      xrays: 2,
      treatmentPlans: 1,
      photos: 3,
    }));

    // 6. Treatments
    await AsyncStorage.setItem(KEYS.PATIENT_TREATMENTS, JSON.stringify([
      { name: "Implant: Whole (Root + Crown)", qty: 2 },
      { name: "Crowns", qty: 1 },
      { name: "Veneers", qty: 1 },
    ]));

    // 7. Cases
    const cases: PatientCase[] = [
      {
        id: "1001",
        patientName: "Sarah Johnson",
        country: "United States",
        date: "2026-02-23",
        treatments: [
          { name: "Implant: Whole (Root + Crown)", qty: 2 },
          { name: "Crowns", qty: 1 },
          { name: "Veneers", qty: 1 },
        ],
        medicalNotes: "No known allergies. Had a filling 2 years ago.",
        dentalIssues: ["Missing Teeth", "Discoloration"],
        filesCount: { xrays: 2, treatmentPlans: 1, photos: 3 },
        status: "booked",
        visitDate: "Mar 15 – Mar 22, 2026",
        birthDate: "1990-05-15",
      },
      {
        id: "1002",
        patientName: "Sarah Johnson",
        country: "United States",
        date: "2026-02-25",
        treatments: [
          { name: "Veneer", qty: 6 },
        ],
        medicalNotes: "",
        dentalIssues: ["Discoloration", "Chipped Teeth"],
        filesCount: { xrays: 1, treatmentPlans: 0, photos: 4 },
        status: "pending",
        visitDate: "TBD",
        birthDate: "1990-05-15",
      },
    ];
    await AsyncStorage.setItem(KEYS.CASES, JSON.stringify(cases));

    // 8. Quotes (for case 1001)
    const quotes: DentistQuote[] = [
      {
        id: "q001",
        caseId: "1001",
        dentistName: "Dr. Kim Minjun",
        clinicName: "Seoul Bright Dental",
        location: "Gangnam, Seoul",
        address: "123 Teheran-ro, Gangnam-gu, Seoul 06133",
        latitude: 37.5012,
        longitude: 127.0396,
        rating: 4.9,
        reviewCount: 127,
        totalPrice: 4150,
        treatments: [
          { name: "Implant: Whole (Root + Crown)", qty: 2, price: 1500 },
          { name: "Crowns", qty: 1, price: 350 },
          { name: "Veneers", qty: 1, price: 800 },
        ],
        treatmentDetails: "Premium Osstem implants with zirconia crowns. Includes free consultation and aftercare package.",
        duration: "6 Days",
        visits: [
          { visit: 1, description: "Initial consultation, panoramic X-ray, teeth cleaning", gapMonths: 0, gapDays: 1, paymentPercent: 30 },
          { visit: 2, description: "Implant placement surgery (2 implants)", gapMonths: 3, gapDays: 0, paymentPercent: 40 },
          { visit: 3, description: "Follow-up check, suture inspection", gapMonths: 0, gapDays: 7, paymentPercent: 0 },
          { visit: 4, description: "Final crown fitting and veneer adjustment", paymentPercent: 30 },
        ],
        message: "We can complete all treatments during your visit. Airport pickup included!",
        createdAt: "2026-02-24T10:30:00Z",
      },
      {
        id: "q002",
        caseId: "1001",
        dentistName: "Dr. Park Soojin",
        clinicName: "Apgujeong Dental Care",
        location: "Apgujeong, Seoul",
        address: "45 Apgujeong-ro, Gangnam-gu, Seoul 06014",
        latitude: 37.5267,
        longitude: 127.0289,
        rating: 4.8,
        reviewCount: 89,
        totalPrice: 4500,
        treatments: [
          { name: "Implant: Whole (Root + Crown)", qty: 2, price: 1600 },
          { name: "Crowns", qty: 1, price: 400 },
          { name: "Veneers", qty: 1, price: 900 },
        ],
        treatmentDetails: "Straumann implants (Swiss) with 10-year warranty. Premium ceramic crowns.",
        duration: "7 Days",
        visits: [
          { visit: 1, description: "Comprehensive exam, 3D CT scan, treatment planning" },
          { visit: 2, description: "Bone preparation and implant surgery" },
          { visit: 3, description: "Recovery check-up, healing assessment" },
          { visit: 4, description: "Crown fabrication and veneer placement" },
          { visit: 5, description: "Final check and veneer polish" },
        ],
        message: "Premium Straumann implants for the best long-term results. 10-year warranty included.",
        createdAt: "2026-02-24T14:15:00Z",
      },
      {
        id: "q003",
        caseId: "1001",
        dentistName: "Dr. Lee Jiwon",
        clinicName: "Myeongdong Smile Clinic",
        location: "Myeongdong, Seoul",
        address: "78 Myeongdong-gil, Jung-gu, Seoul 04536",
        latitude: 37.5636,
        longitude: 126.9869,
        rating: 4.7,
        reviewCount: 203,
        totalPrice: 3600,
        treatments: [
          { name: "Implant: Whole (Root + Crown)", qty: 2, price: 1500 },
          { name: "Crowns", qty: 1, price: 300 },
          { name: "Veneers", qty: 1, price: 800 },
        ],
        treatmentDetails: "Korean-made Dentium implants. Great value with quality results. Includes follow-up checkup.",
        duration: "5 Days",
        visits: [
          { visit: 1, description: "Consultation, X-ray, treatment confirmation" },
          { visit: 2, description: "Implant surgery (both implants)" },
          { visit: 3, description: "Crown and veneer placement" },
        ],
        message: "Most affordable option with great results. Clinic is walking distance from major hotels.",
        createdAt: "2026-02-25T09:00:00Z",
      },
    ];
    await AsyncStorage.setItem(KEYS.QUOTES, JSON.stringify(quotes));

    // 9. Chat rooms + messages
    const chatRooms: ChatRoom[] = [
      {
        id: "chat_001",
        caseId: "1001",
        patientName: "Sarah Johnson",
        dentistName: "Dr. Kim Minjun",
        clinicName: "Seoul Bright Dental",
        lastMessage: "Yes, we provide hotel recommendations near our clinic!",
        lastMessageAt: "2026-02-25T11:30:00Z",
        unreadPatient: 1,
        unreadDoctor: 0,
      },
    ];
    await AsyncStorage.setItem(KEYS.CHATS, JSON.stringify(chatRooms));

    // Chat messages
    const messages: ChatMessage[] = [
      {
        id: "msg_001",
        chatRoomId: "chat_001",
        sender: "patient",
        text: "Hello! I have a question about the treatment plan.",
        originalLang: "en",
        translatedText: "[KO 번역] 안녕하세요! 치료 계획에 대해 질문이 있습니다.",
        timestamp: "2026-02-25T10:00:00Z",
      },
      {
        id: "msg_002",
        chatRoomId: "chat_001",
        sender: "doctor",
        text: "Hi Sarah! Of course, I'd be happy to help. What would you like to know?",
        originalLang: "ko",
        translatedText: "[EN Translation] 안녕하세요 Sarah! 물론이죠, 무엇이 궁금하세요?",
        timestamp: "2026-02-25T10:05:00Z",
      },
      {
        id: "msg_003",
        chatRoomId: "chat_001",
        sender: "patient",
        text: "How long is the recovery time for the implants? And do you recommend any hotels nearby?",
        originalLang: "en",
        translatedText: "How long is the recovery time for the implants? And do you recommend any hotels nearby? → [KO] 회복",
        timestamp: "2026-02-25T10:12:00Z",
      },
      {
        id: "msg_004",
        chatRoomId: "chat_001",
        sender: "doctor",
        text: "The implant procedure itself takes about 1 hour per implant. You'll need 2-3 days of rest after. Most patients can eat soft foods the next day.",
        originalLang: "ko",
        translatedText: "[EN Translation] 임플란트 시술 자체는 1개당 약 1시간 소요됩니다. 시술 후 2-3일 휴식이 필요하며, 대부분 다음 날부터 부드러운 음식 섭취가 가능합니다.",
        timestamp: "2026-02-25T11:00:00Z",
      },
      {
        id: "msg_005",
        chatRoomId: "chat_001",
        sender: "doctor",
        text: "Yes, we provide hotel recommendations near our clinic!",
        originalLang: "ko",
        translatedText: "[EN Translation] 네, 저희 클리닉 근처 호텔 추천도 해드립니다!",
        timestamp: "2026-02-25T11:30:00Z",
      },
    ];
    await AsyncStorage.setItem(KEYS.MESSAGES + "_chat_001", JSON.stringify(messages));

    // 10. Demo Booking (case 1001, Dr. Kim's quote, confirmed — ready for flight info)
    const demoBooking: Booking = {
      id: "bk_demo_001",
      caseId: "1001",
      quoteId: "q001",
      dentistName: "Dr. Kim Minjun",
      clinicName: "Seoul Bright Dental",
      depositPaid: 445,
      totalPrice: 4450,
      treatments: [
        { name: "Implant: Whole (Root + Crown)", qty: 2, price: 1600 },
        { name: "Crowns", qty: 1, price: 450 },
        { name: "Veneers", qty: 1, price: 800 },
      ],
      visitDates: [
        { visit: 1, description: "Initial consultation, panoramic X-ray, teeth cleaning", date: "2026-03-16", confirmedTime: "9:00 AM", gapMonths: 0, gapDays: 1, paymentPercent: 30 },
        { visit: 2, description: "Implant placement surgery (2 implants)", date: "2026-03-17", confirmedTime: "9:00 AM", gapMonths: 3, gapDays: 0, paymentPercent: 40 },
        { visit: 3, description: "Follow-up check, suture inspection", date: "2026-06-19", confirmedTime: "11:00 AM", gapMonths: 0, gapDays: 7, paymentPercent: 0 },
        { visit: 4, description: "Final crown fitting and veneer adjustment", date: "2026-06-26", confirmedTime: "10:00 AM", paymentPercent: 30 },
      ],
      currentVisit: 1,
      status: "confirmed",
      platformFeeRate: 0.20,
      savedCard: { last4: "4242", brand: "Visa", name: "Sarah Johnson", expiry: "12/28" },
      createdAt: "2026-02-25T15:00:00Z",
    };
    await AsyncStorage.setItem(KEYS.BOOKINGS, JSON.stringify([demoBooking]));

    // 11. Demo Reviews (for Dr. Kim — from previous patients)
    const demoReviews: Review[] = [
      {
        id: "rev_001", caseId: "prev_001", bookingId: "bk_prev_001",
        dentistName: "Dr. Kim Minjun", clinicName: "Seoul Bright Dental",
        patientName: "Michael T.", rating: 5, treatmentRating: 5, clinicRating: 5, communicationRating: 5,
        title: "Incredible experience!",
        comment: "Dr. Kim was amazing. The implants look completely natural. Staff spoke perfect English and the clinic was spotless. Would fly back just for dental work!",
        treatments: ["Implant: Whole (Root + Crown)", "Crown"], createdAt: "2026-01-15T10:00:00Z",
      },
      {
        id: "rev_002", caseId: "prev_002", bookingId: "bk_prev_002",
        dentistName: "Dr. Kim Minjun", clinicName: "Seoul Bright Dental",
        patientName: "Emma L.", rating: 5, treatmentRating: 5, clinicRating: 4, communicationRating: 5,
        title: "Best dental care I've ever had",
        comment: "Saved over $4,000 compared to prices back home. Dr. Kim explained everything clearly. Only minor note: the waiting room was a bit small.",
        treatments: ["Veneer", "Veneers"], createdAt: "2026-01-28T14:00:00Z",
      },
      {
        id: "rev_003", caseId: "prev_003", bookingId: "bk_prev_003",
        dentistName: "Dr. Kim Minjun", clinicName: "Seoul Bright Dental",
        patientName: "David K.", rating: 4, treatmentRating: 5, clinicRating: 4, communicationRating: 4,
        title: "Great results, smooth process",
        comment: "Very professional team. The airport pickup was a nice touch. Treatment was painless and results are great. Highly recommend for anyone considering dental tourism.",
        treatments: ["Implant: Whole (Root + Crown)", "Gum Treatment"], createdAt: "2026-02-10T09:00:00Z",
      },
    ];
    await AsyncStorage.setItem(KEYS.REVIEWS, JSON.stringify(demoReviews));

    // 12. Demo Notifications
    const demoNotifs: AppNotification[] = [
      { id: "notif_001", role: "patient", type: "new_quote", title: "New Quote Received!", body: "Dr. Kim Minjun sent you a quote for $2,800", icon: "💰", read: false, route: "/patient/quotes?caseId=1001", createdAt: "2026-02-25T10:30:00Z" },
      { id: "notif_002", role: "patient", type: "new_quote", title: "New Quote Received!", body: "Dr. Park Soojin sent you a quote for $3,400", icon: "💰", read: false, route: "/patient/quotes?caseId=1001", createdAt: "2026-02-25T14:15:00Z" },
      { id: "notif_003", role: "patient", type: "new_quote", title: "New Quote Received!", body: "Dr. Lee Jiwon sent you a quote for $2,400", icon: "💰", read: true, route: "/patient/quotes?caseId=1001", createdAt: "2026-02-25T09:00:00Z" },
      { id: "notif_005", role: "patient", type: "new_message", title: "New Message", body: "Dr. Kim Minjun: \"Yes, we provide hotel recommendations...\"", icon: "💬", read: true, route: "/patient/chat-list", createdAt: "2026-02-25T11:30:00Z" },
      { id: "notif_006", role: "patient", type: "reminder", title: "Complete Your Profile", body: "Add more dental photos to get more accurate quotes", icon: "📸", read: true, createdAt: "2026-02-23T09:00:00Z" },
      { id: "notif_007", role: "doctor", type: "new_case", title: "New Patient Case", body: "Sarah Johnson from USA submitted a new case with 3 treatments", icon: "🦷", read: false, route: "/doctor/case-detail?caseId=1001", createdAt: "2026-02-23T15:00:00Z" },
      { id: "notif_008", role: "doctor", type: "payment_received", title: "Deposit Received", body: "Sarah Johnson paid $445 deposit for Case #1001", icon: "💳", read: false, route: "/doctor/dashboard", createdAt: "2026-02-25T16:00:00Z" },
      { id: "notif_009", role: "doctor", type: "new_message", title: "New Message", body: "Sarah Johnson: \"How long is the recovery time...\"", icon: "💬", read: true, route: "/doctor/chat-list", createdAt: "2026-02-25T10:12:00Z" },
    ];
    await AsyncStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(demoNotifs));

    // Set current user as patient
    await AsyncStorage.setItem(KEYS.CURRENT_USER, JSON.stringify({
      role: "patient",
      name: "Sarah Johnson",
    }));

    console.log("✅ Demo data seeded successfully!");
  },
};
