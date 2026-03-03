import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Booking, DoctorTier, FinalInvoice, TIER_CONFIG, VisitInvoice, store } from "../../lib/store";

const T = {
  teal: "#0f766e",
  tealDeep: "#064e3b",
  tealLight: "#14b8a6",
  cream: "#f0fdfa",
  card: "#ffffff",
  bg: "#f0fdfa",
  white: "#fff",
  text: "#0f172a",
  navy: "#0f172a",
  textSec: "#64748b",
  textMuted: "#94a3b8",
  border: "#e2e8f0",
  amber: "#f59e0b",
  green: "#10b981",
  red: "#ef4444",
};

const TREATMENTS = [
  "Implant: Whole (Root + Crown)", "Implant: Root (Titanium Post) Only", "Implant: Crown Only",
  "Veneers", "Smile Makeover", "Fillings", "Crowns", "Root Canals",
  "Gum Treatment", "Invisalign", "Oral Sleep Appliance",
  "Tongue Tie Surgery", "Wisdom Teeth Extractions", "Other",
];

const PRICE_FLOORS: Record<string, number> = {
  "Implant: Whole (Root + Crown)": 1500,
  "Implant: Root (Titanium Post) Only": 1000,
  "Implant: Crown Only": 500,
  "Veneers": 800,
};

interface InvoiceItem {
  id: string;
  treatment: string;
  qty: number;
  price: number;
}

export default function DoctorFinalInvoiceScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [casePatientName, setCasePatientName] = useState("Patient");

  // Single-visit state
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [notes, setNotes] = useState("");
  const [showPicker, setShowPicker] = useState<string | null>(null);
  const [billingPercent, setBillingPercent] = useState(100);
  const [feeRate, setFeeRate] = useState(0.20);
  const [tierLabel, setTierLabel] = useState("Standard");
  const [tierColor, setTierColor] = useState("#78716c");
  const [hasNewTreatments, setHasNewTreatments] = useState(true);

  // Derived from booking
  const currentVisitNum = booking?.currentVisit || 1;
  const totalVisits = booking?.visitDates?.length || 1;
  const remainingVisits = totalVisits - currentVisitNum;
  const currentVisitData = booking?.visitDates?.find((vd) => vd.visit === currentVisitNum);
  const isFirstVisit = !booking?.finalInvoice?.visitInvoices?.length;

  // Previous invoices data
  const prevInvoices = booking?.finalInvoice?.visitInvoices || [];
  const prevPaidTotal = prevInvoices.filter((vi) => vi.paid).reduce((s, vi) => s + (vi.preDiscountPayment || vi.paymentAmount), 0);
  const prevCarryForward = prevInvoices.length > 0
    ? prevInvoices[prevInvoices.length - 1].carryForward || 0
    : 0;
  const isLastVisit = currentVisitNum >= totalVisits;

  useEffect(() => {
    const load = async () => {
      if (!bookingId) return;
      const bk = await store.getBooking(bookingId);
      if (bk) {
        setBooking(bk);
        const caseData = await store.getCase(bk.caseId);
        if (caseData?.patientName) setCasePatientName(caseData.patientName);

        // Pre-fill treatments from booking (only for first visit)
        const cvn = bk.currentVisit || 1;
        const isFirst = !bk.finalInvoice?.visitInvoices?.length;

        if (isFirst && bk.treatments?.length) {
          setItems(bk.treatments.map((t, i) => ({
            id: String(i + 1), treatment: t.name, qty: t.qty || 1, price: t.price || 0,
          })));
        } else {
          // Subsequent visits — default to no new treatments
          setItems([{ id: "1", treatment: "", qty: 1, price: 0 }]);
          setHasNewTreatments(false);
        }
      }
      // Load doctor tier info
      const dp = await store.getDoctorProfile();
      if (dp) {
        const tier = (dp.tier || "standard") as DoctorTier;
        const cfg = TIER_CONFIG[tier] || TIER_CONFIG.standard;
        setFeeRate(dp.platformFeeRate || cfg.feeRate);
        setTierLabel(cfg.label);
        setTierColor(cfg.color);
      }
      setLoading(false);
    };
    load();
  }, [bookingId]);

  // ── Quote price lookup ──
  const quotePrices = useMemo(() => {
    const map: Record<string, number> = {};
    booking?.treatments?.forEach((t) => { if (t.price > 0) map[t.name] = t.price; });
    return map;
  }, [booking]);

  // ── Calculations (payableBase billing, discount hidden from doctor) ──
  const visitTotal = useMemo(() => {
    if (!hasNewTreatments) return 0;
    return items.reduce((s, i) => s + i.qty * i.price, 0);
  }, [items, hasNewTreatments]);

  // Payable base = new treatments + carry from previous visit
  const payableBase = visitTotal + prevCarryForward;

  // Minimum billing % for Visit 1 — must cover the patient's deposit after 5% discount
  const minBillingPct = useMemo(() => {
    if (!isFirstVisit || isLastVisit || payableBase <= 0) return 1;
    const deposit = booking?.depositPaid || 0;
    if (deposit <= 0) return 1;
    // afterDiscount = billedAmount × 0.95 >= deposit  →  billedAmount >= deposit / 0.95
    const min = Math.ceil((deposit / 0.95) / payableBase * 100);
    return Math.min(min, 100);
  }, [isFirstVisit, isLastVisit, payableBase, booking]);

  // Deposit exceeds Visit 1 even at 100% billing after discount?
  const depositExceedsVisit = isFirstVisit && !isLastVisit && payableBase > 0
    && Math.round(payableBase * 0.95) < (booking?.depositPaid || 0);

  const effectiveBillingPct = isLastVisit ? 100 : Math.max(minBillingPct, billingPercent);
  const billedAmount = Math.round(payableBase * effectiveBillingPct / 100);
  const deferredAmount = payableBase - billedAmount;
  const carryForward = deferredAmount;  // pre-discount amount carried forward

  // 5% discount applied to billedAmount (stored for patient, hidden from doctor)
  const preDiscountPayment = billedAmount;
  const appDiscount = Math.round(preDiscountPayment * 0.05);
  const afterDiscount = preDiscountPayment - appDiscount;
  const depositDeducted = isFirstVisit ? (booking?.depositPaid || 0) : 0;
  const patientPayment = Math.max(0, afterDiscount - depositDeducted);  // patient actually pays

  // Doctor sees full amount (no discount)
  const doctorViewDue = Math.max(0, preDiscountPayment - depositDeducted);

  // ── Platform fee & doctor earnings (based on undiscounted amount) ──
  const platformFee = Math.round(doctorViewDue * feeRate);
  const doctorEarnings = doctorViewDue - platformFee;

  // ── Item Management ──
  const addItem = () => {
    setItems([...items, { id: `${Date.now()}`, treatment: "", qty: 1, price: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map((i) => i.id === id ? { ...i, [field]: value } : i));
  };

  // ── Validation ──
  const isValid = () => {
    // Visit 2+: no new treatments — valid only if there's something to bill
    if (!isFirstVisit && !hasNewTreatments) {
      return doctorViewDue > 0;
    }
    if (items.length === 0) return false;
    for (const item of items) {
      const floor = PRICE_FLOORS[item.treatment] || 0;
      if (!item.treatment.trim() || item.price <= 0 || item.price < floor) return false;
    }
    // Visit 1: treatments must cover the deposit (after discount)
    if (depositExceedsVisit) return false;
    return visitTotal > 0 || prevCarryForward > 0;
  };

  // ── Send ──
  const handleSend = async () => {
    if (!booking || !isValid()) return;

    const alertLines = [];
    if (visitTotal > 0) {
      alertLines.push(`Visit ${currentVisitNum} Treatments: $${visitTotal.toLocaleString()}`);
    }
    if (prevCarryForward > 0) alertLines.push(`Previous carry-forward: +$${prevCarryForward.toLocaleString()}`);
    if (visitTotal > 0 || prevCarryForward > 0) {
      if (payableBase !== billedAmount) {
        alertLines.push(`Total Available: $${payableBase.toLocaleString()}`);
        alertLines.push(`Billing ${effectiveBillingPct}%: $${billedAmount.toLocaleString()}`);
      }
      if (deferredAmount > 0) alertLines.push(`Deferred to next visit: $${deferredAmount.toLocaleString()}`);
    } else {
      alertLines.push("No new treatments this visit.");
    }
    if (isFirstVisit) alertLines.push(`Deposit paid: -$${depositDeducted.toLocaleString()}`);
    alertLines.push("");
    alertLines.push(`Patient Pays: $${doctorViewDue.toLocaleString()}`);
    alertLines.push(`Platform Fee (${tierLabel} ${Math.round(feeRate * 100)}%): -$${platformFee.toLocaleString()}`);
    alertLines.push(`Your Earnings: $${doctorEarnings.toLocaleString()}`);
    if (remainingVisits > 0) {
      alertLines.push("");
      alertLines.push(`${remainingVisits} visit${remainingVisits > 1 ? "s" : ""} remaining after this.`);
    }
    alertLines.push("");
    alertLines.push("Send this invoice to the patient?");

    Alert.alert(
      `Send Visit ${currentVisitNum} Invoice`,
      alertLines.join("\n"),
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send", onPress: async () => {
            setSending(true);

            // Build this visit's invoice
            const validItems = hasNewTreatments
              ? items.filter((i) => i.treatment.trim() && i.price > 0)
              : [];
            const newVisitInvoice: VisitInvoice = {
              visit: currentVisitNum,
              description: currentVisitData?.description || `Visit ${currentVisitNum}`,
              items: validItems.map((i) => ({ treatment: i.treatment.trim(), qty: i.qty, price: i.price })),
              visitTotal,
              prevCarryForward,
              billingPercent: effectiveBillingPct,
              billedAmount,
              deferredAmount,
              carryForward,
              preDiscountPayment,
              appDiscount,
              afterDiscount,
              paymentPercent: 0, // legacy field
              paymentAmount: patientPayment,
              depositDeducted: isFirstVisit ? depositDeducted : 0,
              paid: false,
            };

            // Build/update FinalInvoice (cumulative)
            const existingInvoice = booking.finalInvoice;
            const allVisitInvoices = [...prevInvoices, newVisitInvoice];
            const allFlatItems = allVisitInvoices.flatMap((vi) => vi.items);
            const cumTotal = allFlatItems.reduce((s, i) => s + i.qty * i.price, 0);
            const cumDiscount = allVisitInvoices.reduce((s, vi) => s + vi.appDiscount, 0);
            const cumDiscounted = cumTotal - cumDiscount;
            const deposit = booking.depositPaid || 0;
            const cumBalance = Math.max(0, cumDiscounted - deposit);

            const invoice: FinalInvoice = {
              items: allFlatItems,
              totalAmount: cumTotal,
              appDiscount: cumDiscount,
              discountedTotal: cumDiscounted,
              depositPaid: deposit,
              balanceDue: cumBalance,
              notes: existingInvoice?.notes ? `${existingInvoice.notes}\n\nVisit ${currentVisitNum}: ${notes}` : notes,
              createdAt: existingInvoice?.createdAt || new Date().toISOString(),
              visitInvoices: allVisitInvoices,
            };

            // Update booking
            const bookings = await store.getBookings();
            const bIdx = bookings.findIndex((b) => b.id === booking.id);
            if (bIdx >= 0) {
              // Sync visitDates with payment info for this visit
              const updatedVisitDates = bookings[bIdx].visitDates.map((vd) =>
                vd.visit === currentVisitNum
                  ? { ...vd, paymentAmount: patientPayment, paid: false }
                  : vd
              );
              bookings[bIdx] = {
                ...bookings[bIdx],
                finalInvoice: invoice,
                visitDates: updatedVisitDates,
                status: "treatment_done",
              };
              const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
              await AsyncStorage.setItem("dr_bookings", JSON.stringify(bookings));
            }

            // Notify patient
            await store.addNotification({
              role: "patient",
              type: "payment_received",
              title: "💳 Visit Invoice Ready",
              body: `${booking.dentistName} sent your Visit ${currentVisitNum} invoice. Amount due: $${patientPayment.toLocaleString()}.${remainingVisits > 0 ? ` ${remainingVisits} visit${remainingVisits > 1 ? "s" : ""} remaining.` : ""}`,
              icon: "💳",
              route: `/patient/final-payment?bookingId=${booking.id}`,
            });

            setSending(false);
            setSuccess(true);
          },
        },
      ]
    );
  };

  // ══════ LOADING ══════
  if (loading) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center", backgroundColor: T.bg }]}>
        <ActivityIndicator color={T.teal} size="large" />
      </View>
    );
  }

  // ══════ SUCCESS ══════
  if (success) {
    return (
      <View style={s.container}>
        <LinearGradient
          colors={["#0f766e", "#0d5c56", "#064e3b"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={s.successHeader}
        >
          <View style={s.headerRow}>
            <View style={{ width: 36 }} />
            <View style={s.headerCenter}>
              <Text style={s.headerTitle}>Invoice Sent</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>
          <View style={s.successHeroWrap}>
            <View style={s.successHeroRing}>
              <View style={s.successHeroCircle}>
                <Text style={s.successHeroIcon}>✓</Text>
              </View>
            </View>
            <Text style={s.successHeroTitle}>Visit {currentVisitNum} Invoice Sent!</Text>
            <Text style={s.successHeroAmount}>${doctorViewDue.toLocaleString()} due</Text>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} showsVerticalScrollIndicator={false}>
          <View style={s.receiptCard}>
            <View style={s.receiptRow}>
              <Text style={s.receiptLabel}>Patient</Text>
              <Text style={s.receiptValue}>{casePatientName}</Text>
            </View>
            <View style={s.receiptDivider} />
            {visitTotal > 0 && (
              <View style={s.receiptRow}>
                <Text style={s.receiptLabel}>Visit {currentVisitNum} Treatments</Text>
                <Text style={s.receiptValue}>${visitTotal.toLocaleString()}</Text>
              </View>
            )}
            {prevCarryForward > 0 && (
              <View style={s.receiptRow}>
                <Text style={[s.receiptLabel, { color: T.amber }]}>Previous Carry-forward</Text>
                <Text style={[s.receiptValue, { color: T.amber }]}>+${prevCarryForward.toLocaleString()}</Text>
              </View>
            )}
            {payableBase !== billedAmount && (
              <>
                {payableBase > 0 && (visitTotal > 0 && prevCarryForward > 0) && (
                  <View style={s.receiptRow}>
                    <Text style={s.receiptLabel}>Total Available</Text>
                    <Text style={s.receiptValue}>${payableBase.toLocaleString()}</Text>
                  </View>
                )}
                <View style={s.receiptRow}>
                  <Text style={s.receiptLabel}>Billing {effectiveBillingPct}%</Text>
                  <Text style={s.receiptValue}>${billedAmount.toLocaleString()}</Text>
                </View>
                {deferredAmount > 0 && (
                  <View style={s.receiptRow}>
                    <Text style={[s.receiptLabel, { color: T.amber }]}>Deferred to next</Text>
                    <Text style={[s.receiptValue, { color: T.amber }]}>${deferredAmount.toLocaleString()}</Text>
                  </View>
                )}
              </>
            )}
            {depositDeducted > 0 && (
              <View style={s.receiptRow}>
                <Text style={[s.receiptLabel, { color: T.green }]}>Deposit Applied</Text>
                <Text style={[s.receiptValue, { color: T.green }]}>-${depositDeducted.toLocaleString()}</Text>
              </View>
            )}
            <View style={s.receiptDivider} />
            <View style={s.receiptRow}>
              <Text style={[s.receiptLabel, { fontWeight: "700", color: T.text }]}>Patient Pays</Text>
              <Text style={[s.receiptValue, { fontSize: 18, fontWeight: "900", color: T.teal }]}>${doctorViewDue.toLocaleString()}</Text>
            </View>
            <View style={[s.receiptRow, { backgroundColor: "rgba(16,185,129,0.06)", marginHorizontal: -16, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }]}>
              <Text style={[s.receiptLabel, { color: T.green, fontWeight: "600" }]}>💰 Your Earnings</Text>
              <Text style={[s.receiptValue, { color: T.green, fontWeight: "700" }]}>${doctorEarnings.toLocaleString()}</Text>
            </View>
          </View>

          {remainingVisits > 0 && (
            <View style={s.nextVisitCard}>
              <View style={s.nextVisitDot} />
              <View style={{ flex: 1 }}>
                <Text style={s.nextVisitTitle}>{remainingVisits} visit{remainingVisits > 1 ? "s" : ""} remaining</Text>
                <Text style={s.nextVisitSubText}>You'll invoice again at each check-in</Text>
              </View>
            </View>
          )}

          <Text style={s.successNotice}>
            The patient has been notified and can view their invoice in the app.
          </Text>

          <TouchableOpacity onPress={() => router.replace("/doctor/dashboard" as any)}>
            <LinearGradient colors={["#14b8a6", "#0f766e"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.successBtnGrad}>
              <Text style={s.successBtnText}>Go to Dashboard →</Text>
            </LinearGradient>
          </TouchableOpacity>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  // ══════ FORM ══════
  return (
    <View style={s.container}>
      <LinearGradient colors={["#0f766e", "#0d5c56", "#064e3b"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.headerGrad}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Visit {currentVisitNum} Invoice</Text>
            <Text style={s.headerSub}>{currentVisitData?.description || "Treatment"}</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: T.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* Visit progress banner */}
          <View style={s.visitBanner}>
            <View style={s.visitBannerLeft}>
              <View style={s.visitBadge}><Text style={s.visitBadgeText}>V{currentVisitNum}</Text></View>
              <View>
                <Text style={s.visitBannerTitle}>Visit {currentVisitNum} of {totalVisits}</Text>
                <Text style={s.visitBannerSub}>
                  {remainingVisits > 0
                    ? `${remainingVisits} visit${remainingVisits > 1 ? "s" : ""} remaining after this`
                    : "Final visit"}
                </Text>
              </View>
            </View>
            {prevInvoices.length > 0 && (
              <View style={s.prevPaidBadge}>
                <Text style={s.prevPaidText}>${prevPaidTotal.toLocaleString()} paid</Text>
              </View>
            )}
          </View>

          {/* Patient info */}
          <View style={s.patientCard}>
            <View style={s.patientAvatar}>
              <Text style={s.patientAvatarText}>{casePatientName[0]?.toUpperCase() || "P"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.patientName}>{casePatientName}</Text>
              <Text style={s.patientCase}>Case #{booking?.caseId}</Text>
            </View>
            {isFirstVisit && (
              <View style={s.depositBadge}>
                <Text style={s.depositBadgeText}>10% deposit paid</Text>
              </View>
            )}
          </View>

          {/* ── Original Treatment Plan (Visit 2+ only) ── */}
          {!isFirstVisit && prevInvoices[0]?.items?.length > 0 && (
            <View style={s.origPlanCard}>
              <Text style={s.origPlanTitle}>ORIGINAL TREATMENT PLAN (VISIT 1)</Text>
              {prevInvoices[0].items.map((item, idx) => (
                <View key={idx} style={s.origPlanRow}>
                  <Text style={s.origPlanName} numberOfLines={1}>{item.treatment}</Text>
                  <Text style={s.origPlanQty}>×{item.qty}</Text>
                  <Text style={s.origPlanPrice}>${(item.qty * item.price).toLocaleString()}</Text>
                </View>
              ))}
              <View style={s.origPlanTotalRow}>
                <Text style={s.origPlanTotalLabel}>Total</Text>
                <Text style={s.origPlanTotalValue}>
                  ${prevInvoices[0].items.reduce((sum, i) => sum + i.qty * i.price, 0).toLocaleString()}
                </Text>
              </View>
            </View>
          )}

          {/* ── Treatment Items ── */}
          <View style={s.section}>
            {isFirstVisit ? (
              <Text style={s.sectionTitle}>VISIT {currentVisitNum} TREATMENTS</Text>
            ) : (
              <>
                <Text style={s.sectionTitle}>ANY NEW TREATMENTS?</Text>
                <View style={s.toggleRow}>
                  <TouchableOpacity
                    style={[s.toggleBtn, !hasNewTreatments && s.toggleBtnActive]}
                    onPress={() => setHasNewTreatments(false)}
                  >
                    <Text style={[s.toggleBtnText, !hasNewTreatments && s.toggleBtnTextActive]}>No</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.toggleBtn, hasNewTreatments && s.toggleBtnActive]}
                    onPress={() => setHasNewTreatments(true)}
                  >
                    <Text style={[s.toggleBtnText, hasNewTreatments && s.toggleBtnTextActive]}>Yes</Text>
                  </TouchableOpacity>
                </View>
                {!hasNewTreatments && (
                  <View style={s.noNewTreatmentsInfo}>
                    <Text style={{ fontSize: 16 }}>📋</Text>
                    <Text style={s.noNewTreatmentsText}>
                      {prevCarryForward > 0
                        ? `No new treatments — only the carry-forward of $${prevCarryForward.toLocaleString()} will be charged.`
                        : "No new treatments and no carry-forward — nothing to invoice."}
                    </Text>
                  </View>
                )}
              </>
            )}

            {(isFirstVisit || hasNewTreatments) && items.map((item, idx) => (
              <View key={item.id} style={s.itemCard}>
                <View style={s.itemHeader}>
                  <Text style={s.itemNum}>#{idx + 1}</Text>
                  {items.length > 1 && (
                    <TouchableOpacity onPress={() => removeItem(item.id)}>
                      <Text style={s.removeBtn}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Treatment: combo input + dropdown */}
                <View style={{ gap: 5 }}>
                  <Text style={s.fieldLabel}>Treatment</Text>
                  <View style={s.comboRow}>
                    <Text style={s.comboIcon}>🦷</Text>
                    <TextInput
                      style={s.comboInput}
                      value={item.treatment}
                      onChangeText={(t) => updateItem(item.id, "treatment", t)}
                      placeholder="Type or select treatment..."
                      placeholderTextColor="#94a3b8"
                    />
                    <TouchableOpacity
                      style={s.comboDropdownBtn}
                      onPress={() => setShowPicker(showPicker === item.id ? null : item.id)}
                    >
                      <Text style={s.comboDropdownArrow}>▼</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Treatment picker modal */}
                <Modal
                  visible={showPicker === item.id}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setShowPicker(null)}
                >
                  <TouchableOpacity
                    style={s.pickerOverlay}
                    activeOpacity={1}
                    onPress={() => setShowPicker(null)}
                  >
                    <View style={s.pickerModal} onStartShouldSetResponder={() => true}>
                      <View style={s.pickerModalHeader}>
                        <Text style={s.pickerModalTitle}>Select Treatment</Text>
                        <TouchableOpacity onPress={() => setShowPicker(null)}>
                          <Text style={{ fontSize: 16, color: T.textSec, padding: 4 }}>✕</Text>
                        </TouchableOpacity>
                      </View>
                      <ScrollView style={s.pickerModalList} showsVerticalScrollIndicator>
                        {TREATMENTS.filter((t) => t !== "Other").map((t) => (
                          <TouchableOpacity
                            key={t}
                            style={[s.pickerItem, item.treatment === t && s.pickerItemActive]}
                            onPress={() => {
                              const qp = quotePrices[t];
                              setItems(items.map((i) =>
                                i.id === item.id
                                  ? { ...i, treatment: t, ...(qp && i.price === 0 ? { price: qp } : {}) }
                                  : i
                              ));
                              setShowPicker(null);
                            }}
                          >
                            <Text style={[s.pickerItemText, item.treatment === t && { color: T.teal, fontWeight: "700" }]}>{t}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                      <Text style={s.pickerModalHint}>Or type a custom treatment name in the input field</Text>
                    </View>
                  </TouchableOpacity>
                </Modal>

                {/* Qty + Price */}
                <View style={s.itemRow}>
                  <View style={s.qtySection}>
                    <Text style={s.fieldLabel}>Qty</Text>
                    <View style={s.stepperRow}>
                      <TouchableOpacity style={s.stepperBtn} onPress={() => updateItem(item.id, "qty", Math.max(1, item.qty - 1))}>
                        <Text style={s.stepperBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={s.stepperValue}>{item.qty}</Text>
                      <TouchableOpacity style={s.stepperBtn} onPress={() => updateItem(item.id, "qty", item.qty + 1)}>
                        <Text style={s.stepperBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={s.priceSection}>
                    <Text style={s.fieldLabel}>Unit Price ($)</Text>
                    <TextInput
                      style={s.priceInput}
                      value={item.price > 0 ? String(item.price) : ""}
                      onChangeText={(t) => updateItem(item.id, "price", parseInt(t.replace(/\D/g, "")) || 0)}
                      placeholder="0"
                      placeholderTextColor="#94a3b8"
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={s.lineTotal}>
                    <Text style={s.fieldLabel}>Total</Text>
                    <Text style={s.lineTotalText}>${(item.qty * item.price).toLocaleString()}</Text>
                  </View>
                </View>
                {/* Price floor warning */}
                {PRICE_FLOORS[item.treatment] && item.price > 0 && item.price < PRICE_FLOORS[item.treatment] && (
                  <View style={{ backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 8, padding: 8, borderWidth: 1, borderColor: "rgba(239,68,68,0.2)" }}>
                    <Text style={{ fontSize: 11, color: T.red, fontWeight: "600" }}>
                      ⚠️ Min. price for {item.treatment}: ${PRICE_FLOORS[item.treatment].toLocaleString()}
                    </Text>
                  </View>
                )}
                {PRICE_FLOORS[item.treatment] && item.price === 0 && (
                  <Text style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>
                    Min. ${PRICE_FLOORS[item.treatment].toLocaleString()} per unit
                  </Text>
                )}
              </View>
            ))}

            {(isFirstVisit || hasNewTreatments) && (
              <TouchableOpacity style={s.addItemBtn} onPress={addItem}>
                <Text style={s.addItemBtnText}>+ Add Treatment</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Billing Percentage ── */}
          {!isLastVisit && payableBase > 0 && (
            <View style={s.billingSection}>
              <Text style={s.sectionTitle}>BILLING PERCENTAGE</Text>
              <View style={s.billingCard}>
                <Text style={s.billingHint}>
                  How much of the available amount to charge now?
                </Text>

                {/* Payable base breakdown (when both new treatments + carry exist) */}
                {visitTotal > 0 && prevCarryForward > 0 && (
                  <View style={[s.minBillingNotice, { backgroundColor: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.2)" }]}>
                    <Text style={{ fontSize: 14 }}>📋</Text>
                    <Text style={[s.minBillingText, { color: T.amber }]}>
                      New treatments ${visitTotal.toLocaleString()} + carry-forward ${prevCarryForward.toLocaleString()} = ${payableBase.toLocaleString()} total available
                    </Text>
                  </View>
                )}

                {/* Visit 1 minimum billing notice */}
                {isFirstVisit && minBillingPct > 1 && !depositExceedsVisit && (
                  <View style={s.minBillingNotice}>
                    <Text style={{ fontSize: 14 }}>💰</Text>
                    <Text style={s.minBillingText}>
                      Minimum {minBillingPct}% required — covers the patient's ${(booking?.depositPaid || 0).toLocaleString()} deposit
                    </Text>
                  </View>
                )}

                {/* Deposit exceeds visit total warning */}
                {depositExceedsVisit && (
                  <View style={s.depositWarning}>
                    <Text style={{ fontSize: 14 }}>⚠️</Text>
                    <Text style={s.depositWarningText}>
                      Visit 1 treatments (${Math.round(payableBase * 0.95).toLocaleString()}) must total at least ${(booking?.depositPaid || 0).toLocaleString()} to cover the patient's deposit. Add more treatments or increase prices.
                    </Text>
                  </View>
                )}

                <View style={s.billingInputRow}>
                  <TouchableOpacity
                    style={s.billingStepBtn}
                    onPress={() => setBillingPercent(Math.max(minBillingPct, billingPercent - 10))}
                  >
                    <Text style={s.billingStepBtnText}>−</Text>
                  </TouchableOpacity>
                  <View style={s.billingInputWrap}>
                    <TextInput
                      style={s.billingInput}
                      value={String(effectiveBillingPct)}
                      onChangeText={(t) => {
                        const n = parseInt(t.replace(/\D/g, "")) || 0;
                        setBillingPercent(Math.min(100, Math.max(minBillingPct, n)));
                      }}
                      keyboardType="number-pad"
                      maxLength={3}
                    />
                    <Text style={s.billingInputSuffix}>%</Text>
                  </View>
                  <TouchableOpacity
                    style={s.billingStepBtn}
                    onPress={() => setBillingPercent(Math.min(100, billingPercent + 10))}
                  >
                    <Text style={s.billingStepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                {/* Preset buttons */}
                <View style={s.billingPresets}>
                  {[25, 50, 75, 100].map((p) => {
                    const belowMin = p < minBillingPct;
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[
                          s.billingPresetBtn,
                          effectiveBillingPct === p && s.billingPresetBtnActive,
                          belowMin && { opacity: 0.35 },
                        ]}
                        onPress={() => !belowMin && setBillingPercent(p)}
                        disabled={belowMin}
                      >
                        <Text style={[s.billingPresetText, effectiveBillingPct === p && s.billingPresetTextActive]}>{p}%</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {/* Breakdown */}
                <View style={s.billingBreakdown}>
                  <View style={s.billingBreakdownRow}>
                    <Text style={s.billingBreakdownLabel}>Charging now</Text>
                    <Text style={s.billingBreakdownValue}>${billedAmount.toLocaleString()}</Text>
                  </View>
                  {deferredAmount > 0 && (
                    <View style={s.billingBreakdownRow}>
                      <Text style={[s.billingBreakdownLabel, { color: T.amber }]}>Deferred to next visit</Text>
                      <Text style={[s.billingBreakdownValue, { color: T.amber }]}>${deferredAmount.toLocaleString()}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}
          {isLastVisit && totalVisits > 1 && payableBase > 0 && (
            <View style={s.billingSection}>
              <Text style={s.sectionTitle}>BILLING PERCENTAGE</Text>
              <View style={s.billingFinalNotice}>
                <Text style={{ fontSize: 16 }}>⚠️</Text>
                <Text style={s.billingFinalText}>This is the final visit — 100% billing required. No deferral allowed.</Text>
              </View>
            </View>
          )}

          {/* ── Notes ── */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>NOTES (OPTIONAL)</Text>
            <TextInput
              style={s.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Post-treatment instructions, follow-up notes..."
              placeholderTextColor="#94a3b8"
              multiline
              maxLength={500}
            />
          </View>

          {/* ── Summary ── */}
          <View style={s.summaryCard}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: T.textSec, letterSpacing: 0.5, marginBottom: 4 }}>
              VISIT {currentVisitNum} SUMMARY
            </Text>
            {visitTotal > 0 && (
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Visit {currentVisitNum} Treatments</Text>
                <Text style={s.summaryValue}>${visitTotal.toLocaleString()}</Text>
              </View>
            )}
            {prevCarryForward > 0 && (
              <View style={s.summaryRow}>
                <Text style={[s.summaryLabel, { color: T.amber }]}>Previous Carry-forward</Text>
                <Text style={[s.summaryValue, { color: T.amber }]}>+${prevCarryForward.toLocaleString()}</Text>
              </View>
            )}
            {(visitTotal > 0 && prevCarryForward > 0) && (
              <View style={s.summaryRow}>
                <Text style={[s.summaryLabel, { fontWeight: "600" }]}>Total Available</Text>
                <Text style={[s.summaryValue, { fontWeight: "700" }]}>${payableBase.toLocaleString()}</Text>
              </View>
            )}
            {payableBase !== billedAmount && (
              <>
                <View style={s.summaryRow}>
                  <Text style={[s.summaryLabel, { fontWeight: "600" }]}>Billing {effectiveBillingPct}%</Text>
                  <Text style={[s.summaryValue, { fontWeight: "700" }]}>${billedAmount.toLocaleString()}</Text>
                </View>
                {deferredAmount > 0 && (
                  <View style={s.summaryRow}>
                    <Text style={[s.summaryLabel, { color: T.amber }]}>Deferred to later</Text>
                    <Text style={[s.summaryValue, { color: T.amber }]}>${deferredAmount.toLocaleString()}</Text>
                  </View>
                )}
              </>
            )}
            <View style={s.summaryDivider} />
            {isFirstVisit && (
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Deposit Paid (10%)</Text>
                <Text style={[s.summaryValue, { color: T.green }]}>-${depositDeducted.toLocaleString()}</Text>
              </View>
            )}
            <View style={s.summaryRow}>
              <Text style={s.balanceLabel}>Patient Pays</Text>
              <Text style={s.balanceValue}>${doctorViewDue.toLocaleString()}</Text>
            </View>

            {/* Platform Fee & Earnings */}
            <View style={s.summaryDivider} />
            <View style={s.summaryRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={[s.tierBadgeSm, { backgroundColor: tierColor }]}>
                  <Text style={s.tierBadgeSmText}>{tierLabel}</Text>
                </View>
                <Text style={[s.summaryLabel, { color: T.textSec }]}>Platform Fee ({Math.round(feeRate * 100)}%)</Text>
              </View>
              <Text style={[s.summaryValue, { color: T.red }]}>- ${platformFee.toLocaleString()}</Text>
            </View>
            <View style={[s.summaryRow, { backgroundColor: "rgba(16,185,129,0.06)", marginHorizontal: -12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginTop: 4 }]}>
              <Text style={[s.balanceLabel, { color: T.green }]}>💰 Your Earnings</Text>
              <Text style={[s.balanceValue, { color: T.green }]}>${doctorEarnings.toLocaleString()}</Text>
            </View>

            {/* Remaining visits info */}
            {remainingVisits > 0 && (
              <>
                <View style={s.summaryDivider} />
                <View style={s.remainingInfo}>
                  <Text style={s.remainingInfoIcon}>📅</Text>
                  <Text style={s.remainingInfoText}>
                    {remainingVisits} more visit{remainingVisits > 1 ? "s" : ""} after this — invoiced at each check-in
                  </Text>
                </View>
              </>
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom */}
      <View style={s.bottomBar}>
        <View>
          <Text style={s.bottomLabel}>Visit {currentVisitNum} Due</Text>
          <Text style={s.bottomAmount}>${doctorViewDue.toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          onPress={handleSend}
          disabled={!isValid() || sending}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={isValid() ? ["#14b8a6", "#0f766e"] : ["#cbd5e1", "#94a3b8"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.sendBtnGrad}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.sendBtnText}>Send Invoice →</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.cream },
  headerGrad: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 18 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  backArrow: { fontSize: 24, color: "#fff", fontWeight: "600", marginTop: -2 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: T.white },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  content: { padding: 20, gap: 16 },

  // Visit banner
  visitBanner: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "rgba(20,184,166,0.06)", borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "rgba(20,184,166,0.15)",
  },
  visitBannerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  visitBadge: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: T.teal,
    alignItems: "center", justifyContent: "center",
  },
  visitBadgeText: { color: T.white, fontSize: 14, fontWeight: "800" },
  visitBannerTitle: { fontSize: 14, fontWeight: "700", color: T.text },
  visitBannerSub: { fontSize: 11, color: T.textSec, marginTop: 1 },
  prevPaidBadge: {
    backgroundColor: "rgba(16,185,129,0.1)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  prevPaidText: { fontSize: 10, fontWeight: "600", color: T.green },

  // Patient
  patientCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: T.white, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: T.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  patientAvatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: T.tealLight,
    alignItems: "center", justifyContent: "center",
  },
  patientAvatarText: { color: T.white, fontSize: 16, fontWeight: "700" },
  patientName: { fontSize: 15, fontWeight: "700", color: T.text },
  patientCase: { fontSize: 12, color: T.textSec },
  depositBadge: {
    backgroundColor: "rgba(16,185,129,0.1)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5,
  },
  depositBadgeText: { fontSize: 10, fontWeight: "600", color: T.green },

  // Original Treatment Plan (Visit 2+)
  origPlanCard: {
    backgroundColor: T.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "rgba(15,118,110,0.12)", gap: 6,
    borderLeftWidth: 3, borderLeftColor: T.teal,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  origPlanTitle: {
    fontSize: 10, fontWeight: "800", color: T.textMuted, letterSpacing: 1,
    marginBottom: 6,
  },
  origPlanRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: "#f1f5f9",
  },
  origPlanName: { flex: 1, fontSize: 13, fontWeight: "500", color: T.textSec },
  origPlanQty: { fontSize: 12, color: T.textMuted, marginHorizontal: 12, minWidth: 24 },
  origPlanPrice: { fontSize: 13, fontWeight: "600", color: T.textSec },
  origPlanTotalRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingTop: 8, marginTop: 4,
  },
  origPlanTotalLabel: { fontSize: 12, fontWeight: "700", color: T.textSec },
  origPlanTotalValue: { fontSize: 13, fontWeight: "800", color: T.text },

  // Toggle (Any new treatments?)
  toggleRow: {
    flexDirection: "row", gap: 10, marginVertical: 4,
  },
  toggleBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center",
    backgroundColor: T.card, borderWidth: 1.5, borderColor: T.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3, elevation: 1,
  },
  toggleBtnActive: {
    backgroundColor: "rgba(15,118,110,0.08)", borderColor: T.teal,
    shadowColor: T.teal, shadowOpacity: 0.1,
  },
  toggleBtnText: { fontSize: 15, fontWeight: "700", color: T.textMuted },
  toggleBtnTextActive: { color: T.teal },
  noNewTreatmentsInfo: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "rgba(15,118,110,0.04)", borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "rgba(15,118,110,0.1)",
  },
  noNewTreatmentsText: { fontSize: 13, color: T.textSec, flex: 1, lineHeight: 20 },

  // Section
  section: { gap: 10 },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: T.textSec, letterSpacing: 0.5 },

  // Item card
  itemCard: {
    backgroundColor: T.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: T.border, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemNum: { fontSize: 12, fontWeight: "700", color: T.textSec },
  removeBtn: { fontSize: 16, color: T.red, fontWeight: "700", padding: 4 },

  // Combo input (icon + TextInput + dropdown button)
  comboRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: T.bg, borderRadius: 10, borderWidth: 1,
    borderColor: T.border, overflow: "hidden",
  },
  comboIcon: {
    fontSize: 15, paddingLeft: 14,
  },
  comboInput: {
    flex: 1, fontSize: 14, color: T.text, fontWeight: "500",
    paddingLeft: 10, paddingRight: 8, paddingVertical: 13,
  },
  comboDropdownBtn: {
    paddingHorizontal: 16, paddingVertical: 13,
    borderLeftWidth: 1, borderLeftColor: T.border,
    backgroundColor: "rgba(241,245,249,0.6)",
  },
  comboDropdownArrow: { fontSize: 10, color: T.textSec },

  // Picker modal
  pickerOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center", alignItems: "center", padding: 32,
  },
  pickerModal: {
    backgroundColor: T.white, borderRadius: 16, width: "100%", maxHeight: "70%",
    overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  pickerModalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  pickerModalTitle: { fontSize: 15, fontWeight: "700", color: T.text },
  pickerModalList: { maxHeight: 400 },
  pickerModalHint: {
    fontSize: 11, color: T.textMuted, textAlign: "center",
    paddingVertical: 12, paddingHorizontal: 16,
    borderTopWidth: 1, borderTopColor: T.border,
  },
  pickerItem: {
    paddingHorizontal: 18, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  pickerItemActive: { backgroundColor: "rgba(20,184,166,0.08)" },
  pickerItemText: { fontSize: 14, color: T.textSec },

  // Qty + Price row
  itemRow: { flexDirection: "row", gap: 12 },
  qtySection: { gap: 4 },
  priceSection: { flex: 1, gap: 4 },
  lineTotal: { gap: 4, alignItems: "flex-end", justifyContent: "flex-end" },
  fieldLabel: { fontSize: 10, color: T.textSec, fontWeight: "600" },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepperBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: T.border,
  },
  stepperBtnText: { fontSize: 18, fontWeight: "600", color: T.teal },
  stepperValue: { fontSize: 18, fontWeight: "800", color: T.text, width: 24, textAlign: "center" },
  priceInput: {
    backgroundColor: T.bg, borderRadius: 10, borderWidth: 1,
    borderColor: T.border, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 16, fontWeight: "700", color: T.text,
  },
  lineTotalText: { fontSize: 16, fontWeight: "800", color: T.teal },

  // Add item
  addItemBtn: {
    borderWidth: 1.5, borderColor: T.border, borderStyle: "dashed",
    borderRadius: 12, paddingVertical: 14, alignItems: "center",
  },
  addItemBtnText: { fontSize: 14, fontWeight: "600", color: T.teal },

  // Billing %
  billingSection: { gap: 10 },
  billingCard: {
    backgroundColor: T.card, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: T.border, gap: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  billingHint: { fontSize: 12, color: T.textSec, lineHeight: 18 },
  billingInputRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16,
  },
  billingStepBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "#f1f5f9", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: T.border,
  },
  billingStepBtnText: { fontSize: 20, fontWeight: "700", color: T.teal },
  billingInputWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: T.bg, borderRadius: 12, borderWidth: 1.5, borderColor: T.teal,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  billingInput: {
    fontSize: 28, fontWeight: "900", color: T.text, textAlign: "center",
    minWidth: 60, paddingVertical: 0,
  },
  billingInputSuffix: { fontSize: 20, fontWeight: "700", color: T.textSec, marginLeft: 2 },
  billingPresets: { flexDirection: "row", justifyContent: "center", gap: 8 },
  billingPresetBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: T.border,
  },
  billingPresetBtnActive: {
    backgroundColor: T.teal, borderColor: T.teal,
  },
  billingPresetText: { fontSize: 13, fontWeight: "600", color: T.textSec },
  billingPresetTextActive: { color: T.white },
  billingBreakdown: {
    backgroundColor: "rgba(20,184,166,0.04)", borderRadius: 10, padding: 12, gap: 6,
  },
  billingBreakdownRow: { flexDirection: "row", justifyContent: "space-between" },
  billingBreakdownLabel: { fontSize: 13, color: T.textSec },
  billingBreakdownValue: { fontSize: 13, fontWeight: "700", color: T.teal },
  billingFinalNotice: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "rgba(245,158,11,0.2)",
  },
  billingFinalText: { fontSize: 12, color: T.amber, flex: 1, fontWeight: "600", lineHeight: 18 },
  minBillingNotice: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(20,184,166,0.08)", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "rgba(20,184,166,0.2)",
  },
  minBillingText: { fontSize: 12, color: T.teal, flex: 1, fontWeight: "600", lineHeight: 18 },
  depositWarning: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: "rgba(239,68,68,0.2)",
  },
  depositWarningText: { fontSize: 12, color: T.red, flex: 1, fontWeight: "600", lineHeight: 18 },

  // Notes
  notesInput: {
    backgroundColor: T.card, borderRadius: 14, borderWidth: 1,
    borderColor: T.border, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 13, color: T.text, height: 80, textAlignVertical: "top",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },

  // Summary
  summaryCard: {
    backgroundColor: T.card, borderRadius: 18, padding: 22,
    borderWidth: 1, borderColor: T.border, gap: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryLabel: { fontSize: 14, color: T.textSec },
  summaryValue: { fontSize: 14, fontWeight: "600", color: T.text },
  summaryDivider: { height: 1, backgroundColor: T.border, marginVertical: 4 },
  balanceLabel: { fontSize: 16, fontWeight: "700", color: T.text },
  balanceValue: { fontSize: 20, fontWeight: "900", color: T.amber },
  tierBadgeSm: {
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  tierBadgeSmText: { fontSize: 9, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },
  remainingInfo: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "rgba(59,130,246,0.06)", borderRadius: 10, padding: 12,
  },
  remainingInfoIcon: { fontSize: 16 },
  remainingInfoText: { fontSize: 12, color: T.textSec, flex: 1 },

  // Bottom
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40,
    backgroundColor: T.card,
    borderTopWidth: 1, borderTopColor: T.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 8,
  },
  bottomLabel: { fontSize: 11, color: T.textMuted, fontWeight: "500" },
  bottomAmount: { fontSize: 24, fontWeight: "900", color: T.teal },
  sendBtnGrad: { borderRadius: 14, paddingHorizontal: 26, paddingVertical: 16 },
  sendBtnText: { color: T.white, fontSize: 15, fontWeight: "700" },

  // Success
  successHeader: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 36 },
  successHeroWrap: { alignItems: "center", marginTop: 22 },
  successHeroRing: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.25)",
  },
  successHeroCircle: {
    width: 74, height: 74, borderRadius: 37,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.15)",
  },
  successHeroIcon: { fontSize: 38, color: "#fff", fontWeight: "900" },
  successHeroTitle: { fontSize: 25, fontWeight: "900", color: "#fff", marginTop: 16 },
  successHeroAmount: { fontSize: 16, color: "rgba(255,255,255,0.8)", marginTop: 5 },

  receiptCard: {
    backgroundColor: T.card, borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: T.border, gap: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    marginTop: 16,
  },
  receiptRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 10,
  },
  receiptLabel: { fontSize: 13, color: T.textSec },
  receiptValue: { fontSize: 14, fontWeight: "600", color: T.text },
  receiptDivider: { height: 1, backgroundColor: "#f1f5f9" },

  nextVisitCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: "rgba(15,118,110,0.04)", borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "rgba(15,118,110,0.08)",
  },
  nextVisitDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: T.tealLight,
  },
  nextVisitTitle: { fontSize: 14, fontWeight: "700", color: T.text },
  nextVisitSubText: { fontSize: 11, color: T.textSec, marginTop: 2 },

  successNotice: {
    fontSize: 13, color: T.textSec, textAlign: "center", lineHeight: 20,
    paddingHorizontal: 8,
  },
  successBtnGrad: { borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  successBtnText: { color: T.white, fontSize: 16, fontWeight: "700" },
});
