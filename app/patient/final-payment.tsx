import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Animated, Easing, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { Booking, VisitInvoice, store } from "../../lib/store";

/* ── palette ── */
const C = {
  plum: "#3B0764",
  violet: "#6B21A8",
  lavender: "#8b5cf6",
  lilac: "#c4b5fd",
  cream: "#faf8ff",
  card: "#ffffff",
  navy: "#0f172a",
  text: "#1e293b",
  sub: "#64748b",
  muted: "#94a3b8",
  faint: "#cbd5e1",
  border: "#ede9f4",
  emerald: "#059669",
  emeraldDeep: "#047857",
  emeraldLight: "#ecfdf5",
  green: "#16a34a",
  greenLight: "#dcfce7",
  amber: "#f59e0b",
  amberLight: "#fffbeb",
  red: "#ef4444",
};

export default function FinalPaymentScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [paidVisitNum, setPaidVisitNum] = useState<number | null>(null);

  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [useSavedCard, setUseSavedCard] = useState(false);
  const [showOrigPlan, setShowOrigPlan] = useState(false);

  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    const load = async () => {
      if (!bookingId) return;
      const bk = await store.getBooking(bookingId);
      if (bk) {
        setBooking(bk);
        if (bk.status === "payment_complete") setSuccess(true);
        if (bk.savedCard) setUseSavedCard(true);
      }
      setLoading(false);
    };
    load();
  }, [bookingId]);

  useEffect(() => {
    if (success || paying) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.02, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [success, paying]);

  const invoice = booking?.finalInvoice;
  const visitInvoices = invoice?.visitInvoices || [];
  const totalVisits = booking?.visitDates?.length || 1;
  const currentVisitNum = booking?.currentVisit || 1;
  const remainingAfterThis = totalVisits - currentVisitNum;
  const isLastVisit = currentVisitNum >= totalVisits;

  const currentVI = useMemo(() => {
    if (!visitInvoices.length) return null;
    return visitInvoices.find((vi) => vi.visit === currentVisitNum && !vi.paid) || null;
  }, [visitInvoices, currentVisitNum]);

  const currentPayAmount = currentVI?.paymentAmount || 0;
  const paidVisits = visitInvoices.filter((vi) => vi.paid);
  const totalPaidSoFar = paidVisits.reduce((s, vi) => s + (vi.preDiscountPayment || vi.paymentAmount), 0);

  const formatCard = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatExpiry = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 4);
    if (digits.length > 2) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  };

  const isCardValid = () => {
    return cardName.length >= 2 && cardNumber.replace(/\s/g, "").length === 16 && expiry.length === 5 && cvc.length >= 3;
  };

  const canPay = useSavedCard ? !!(booking?.savedCard) : isCardValid();

  const handlePay = async () => {
    if (!booking || !currentVI || !canPay) return;
    setPaying(true);

    await new Promise((r) => setTimeout(r, 2000));

    const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
    const bookings = await store.getBookings();
    const idx = bookings.findIndex((b) => b.id === booking.id);

    if (idx >= 0) {
      const bk = { ...bookings[idx] };
      if (bk.finalInvoice?.visitInvoices) {
        const updatedVIs = bk.finalInvoice.visitInvoices.map((vi) =>
          vi.visit === currentVisitNum
            ? { ...vi, paid: true, paidAt: new Date().toISOString() }
            : vi
        );
        bk.finalInvoice = { ...bk.finalInvoice, visitInvoices: updatedVIs };
      }
      bk.visitDates = bk.visitDates.map((vd) =>
        vd.visit === currentVisitNum ? { ...vd, paid: true } : vd
      );
      if (isLastVisit) {
        bk.status = "payment_complete";
      } else {
        bk.status = "between_visits";
        bk.currentVisit = currentVisitNum + 1;
      }
      bookings[idx] = bk;
      await AsyncStorage.setItem("dr_bookings", JSON.stringify(bookings));
      setBooking(bk);
    }

    await store.addNotification({
      role: "doctor",
      type: "payment_received",
      title: isLastVisit ? "💰 All Payments Complete!" : `💰 Visit ${currentVisitNum} Paid`,
      body: isLastVisit
        ? `Your patient has completed all payments ($${currentPayAmount.toLocaleString()} for Visit ${currentVisitNum}). Treatment cycle complete!`
        : `Patient paid Visit ${currentVisitNum} ($${currentPayAmount.toLocaleString()}). ${remainingAfterThis} visit${remainingAfterThis > 1 ? "s" : ""} remaining.`,
      icon: "💰",
      route: `/doctor/case-detail?caseId=${booking.caseId}`,
    });

    setPaying(false);
    setPaidVisitNum(currentVisitNum);
    setSuccess(true);
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={C.violet} size="large" />
      </View>
    );
  }

  /* ══════ SUCCESS ══════ */
  if (success) {
    const displayVisitNum = paidVisitNum || currentVisitNum;
    const displayIsLast = displayVisitNum >= totalVisits;
    const nextVisitNum = displayVisitNum + 1;
    const nextVisitData = booking?.visitDates?.find((vd) => vd.visit === nextVisitNum);
    const displayRemaining = totalVisits - displayVisitNum;
    const paidVI = visitInvoices.find((vi) => vi.visit === displayVisitNum) || currentVI;
    const paidAmount = paidVI?.paymentAmount || currentPayAmount;

    return (
      <View style={s.container}>
        <LinearGradient
          colors={displayIsLast ? ["#059669", "#047857", "#065f46"] : ["#6B21A8", "#4A0080", "#3B0764"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={s.successHeader}
        >
          <View style={s.headerRow}>
            <View style={{ width: 36 }} />
            <View style={s.headerCenter}>
              <Text style={s.headerTitle}>{displayIsLast ? "All Paid!" : "Payment Confirmed"}</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>
          <View style={s.successHeroWrap}>
            <View style={s.successHeroRing}>
              <View style={s.successHeroCircle}>
                <Text style={s.successHeroIcon}>{displayIsLast ? "🎉" : "✓"}</Text>
              </View>
            </View>
            <Text style={s.successHeroTitle}>
              {displayIsLast ? "Treatment Complete!" : `Visit ${displayVisitNum} Paid`}
            </Text>
            <Text style={s.successHeroAmount}>${paidAmount.toLocaleString()}</Text>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={[s.scrollContent, { paddingTop: 0 }]} showsVerticalScrollIndicator={false}>
          {/* Receipt card */}
          <View style={s.receiptCard}>
            <View style={s.receiptHeader}>
              <Text style={s.receiptHeaderLabel}>PAYMENT RECEIPT</Text>
              <Text style={s.receiptHeaderDate}>
                {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </Text>
            </View>
            <View style={s.perfRow}>
              <View style={s.perfNotchL} />
              <View style={s.perfDashes} />
              <View style={s.perfNotchR} />
            </View>
            <View style={s.receiptBody}>
              {paidVI && (
                <>
                  {paidVI.visitTotal > 0 && (
                    <View style={s.receiptRow}>
                      <Text style={s.receiptLabel}>Visit {displayVisitNum} Treatments</Text>
                      <Text style={s.receiptValue}>${paidVI.visitTotal.toLocaleString()}</Text>
                    </View>
                  )}
                  {(paidVI.prevCarryForward || 0) > 0 && (
                    <View style={s.receiptRow}>
                      <Text style={[s.receiptLabel, { color: C.amber }]}>Previous Carry-forward</Text>
                      <Text style={[s.receiptValue, { color: C.amber }]}>
                        +${paidVI.prevCarryForward.toLocaleString()}
                      </Text>
                    </View>
                  )}
                  {paidVI.billingPercent !== undefined && paidVI.billingPercent < 100 && (
                    <View style={s.receiptRow}>
                      <Text style={s.receiptLabel}>Billing {paidVI.billingPercent}%</Text>
                      <Text style={s.receiptValue}>${(paidVI.billedAmount || 0).toLocaleString()}</Text>
                    </View>
                  )}
                  {(paidVI.appDiscount || 0) > 0 && (
                    <View style={s.receiptRow}>
                      <Text style={[s.receiptLabel, { color: C.emerald }]}>5% App Discount</Text>
                      <Text style={[s.receiptValue, { color: C.emerald }]}>
                        -${paidVI.appDiscount.toLocaleString()}
                      </Text>
                    </View>
                  )}
                  {(paidVI.depositDeducted || 0) > 0 && (
                    <View style={s.receiptRow}>
                      <Text style={[s.receiptLabel, { color: C.emerald }]}>Deposit Applied</Text>
                      <Text style={[s.receiptValue, { color: C.emerald }]}>
                        -${paidVI.depositDeducted!.toLocaleString()}
                      </Text>
                    </View>
                  )}
                  <View style={s.receiptDivider} />
                  <View style={s.receiptRow}>
                    <Text style={[s.receiptLabel, { fontWeight: "700", color: C.navy }]}>Amount Paid</Text>
                    <Text style={[s.receiptValue, { fontSize: 20, fontWeight: "900", color: C.emerald }]}>
                      ${paidAmount.toLocaleString()}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Next visit (non-last) */}
          {!displayIsLast && nextVisitData && (
            <View style={s.nextCard}>
              <View style={s.nextCardHeader}>
                <View style={s.nextDotRing}>
                  <View style={s.nextDot} />
                </View>
                <Text style={s.nextCardTitle}>Next Up</Text>
              </View>
              <Text style={s.nextVisitLabel}>Visit {nextVisitNum}: {nextVisitData.description}</Text>
              <Text style={s.nextVisitSub}>
                {displayRemaining} visit{displayRemaining > 1 ? "s" : ""} remaining
              </Text>
              <Text style={s.nextHint}>
                Check in again at the clinic for your next visit. Your dentist will send a new invoice after treatment.
              </Text>
            </View>
          )}

          {/* What's next (last visit) */}
          {displayIsLast && (
            <View style={s.whatsNextCard}>
              <Text style={s.whatsNextTitle}>What's Next</Text>
              {[
                { icon: "✉️", text: "Payment receipt via email" },
                { icon: "🦷", text: "Follow your dentist's aftercare instructions" },
                { icon: "⭐", text: "Leave a review to help other patients" },
              ].map((item, i) => (
                <View key={i} style={s.whatsNextRow}>
                  <View style={s.whatsNextIconWrap}>
                    <Text style={{ fontSize: 14 }}>{item.icon}</Text>
                  </View>
                  <Text style={s.whatsNextText}>{item.text}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={s.successActions}>
            {displayIsLast && (
              <TouchableOpacity
                style={s.actionReview}
                onPress={() => router.push({
                  pathname: "/patient/write-review" as any,
                  params: { bookingId: booking?.id, dentistName: booking?.dentistName, clinicName: booking?.clinicName },
                })}
              >
                <LinearGradient colors={["#f59e0b", "#d97706"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.actionReviewGrad}>
                  <Text style={s.actionReviewText}>⭐  Write a Review</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={s.actionDash}
              onPress={() => router.replace("/patient/dashboard" as any)}
            >
              <Text style={s.actionDashText}>Go to Dashboard</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    );
  }

  /* ══════ NO INVOICE ══════ */
  if (!invoice || !currentVI) {
    return (
      <View style={s.container}>
        <LinearGradient colors={["#3D0070", "#2F0058", "#220040"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.headerGrad}>
          <View style={s.headerRow}>
            <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
              <Text style={s.backArrow}>‹</Text>
            </TouchableOpacity>
            <View style={s.headerCenter}>
              <Text style={s.headerTitle}>Payment</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>
        </LinearGradient>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 32 }}>
          <View style={s.waitingIconWrap}>
            <Text style={{ fontSize: 36 }}>⏳</Text>
          </View>
          <Text style={s.waitingTitle}>Waiting for Invoice</Text>
          <Text style={s.waitingSub}>
            Your dentist will send the invoice after your Visit {currentVisitNum} treatment is complete. You'll receive a notification when it's ready.
          </Text>
        </View>
      </View>
    );
  }

  /* ══════ PAYMENT FORM ══════ */
  return (
    <View style={s.container}>
      <LinearGradient colors={["#3D0070", "#2F0058", "#220040"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.headerGrad}>
        <View style={s.headerRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Visit {currentVisitNum} Payment</Text>
            {false && totalVisits > 1 && <Text style={s.headerSub}>Visit {currentVisitNum} of {totalVisits}</Text>}
          </View>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Discount banner */}
          <View style={s.discountBanner}>
            <LinearGradient colors={["#ecfdf5", "#f0fdf4"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.discountGrad}>
              <View style={s.discountIconWrap}>
                <Text style={{ fontSize: 16 }}>🎉</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.discountTitle}>5% App Payment Discount</Text>
                <Text style={s.discountSub}>Pay through DentaRoute and save automatically</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Visit Progress (multi-visit) */}
          {totalVisits > 1 && booking?.visitDates && (
            <View style={s.progressCard}>
              <Text style={s.sectionLabel}>VISIT PROGRESS</Text>
              {booking.visitDates.map((vd, idx) => {
                const vi = visitInvoices.find((v) => v.visit === vd.visit);
                const isPaid = vi?.paid || false;
                const isCurrent = vd.visit === currentVisitNum;
                const isUpcoming = vd.visit > currentVisitNum;
                const isLast = idx === booking.visitDates!.length - 1;
                return (
                  <View key={vd.visit}>
                    <View style={s.tlRow}>
                      <View style={s.tlDotCol}>
                        <View style={[
                          s.tlDot,
                          isPaid && s.tlDotDone,
                          isCurrent && s.tlDotCurrent,
                        ]}>
                          {isPaid && <Text style={{ fontSize: 8, color: "#fff" }}>✓</Text>}
                        </View>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Text style={[s.tlLabel, isPaid && s.tlLabelDone, isCurrent && s.tlLabelCurrent]}>
                            Visit {vd.visit}
                          </Text>
                          {isCurrent && <View style={s.payNowBadge}><Text style={s.payNowText}>PAY NOW</Text></View>}
                          {isPaid && <Text style={s.paidCheck}>Paid ✓</Text>}
                        </View>
                        <Text style={s.tlDesc} numberOfLines={1}>
                          {vd.description}
                          {vi && vi.billingPercent !== undefined && vi.billingPercent < 100
                            ? ` (${vi.billingPercent}% billed)` : ""}
                        </Text>
                      </View>
                      {isPaid && vi ? (
                        <Text style={s.tlAmountPaid}>${(vi.preDiscountPayment || vi.paymentAmount).toLocaleString()}</Text>
                      ) : isCurrent ? (
                        <Text style={s.tlAmountCurrent}>${currentPayAmount.toLocaleString()}</Text>
                      ) : (
                        <Text style={s.tlAmountUpcoming}>{isUpcoming ? "Upcoming" : ""}</Text>
                      )}
                    </View>
                    {!isLast && <View style={s.tlLine} />}
                  </View>
                );
              })}
            </View>
          )}

          {/* ── Original Treatment Plan (Visit 2+ only) ── */}
          {currentVisitNum > 1 && visitInvoices[0]?.items?.length > 0 && (
            <TouchableOpacity
              style={s.origPlanCard}
              onPress={() => setShowOrigPlan(!showOrigPlan)}
              activeOpacity={0.7}
            >
              <View style={s.origPlanHeader}>
                <Text style={s.origPlanTitle}>ORIGINAL TREATMENT PLAN</Text>
                <Text style={s.origPlanToggle}>{showOrigPlan ? "▲" : "▼"}</Text>
              </View>
              {showOrigPlan && (
                <>
                  {visitInvoices[0].items.map((item, idx) => (
                    <View key={idx} style={s.origPlanRow}>
                      <Text style={s.origPlanName} numberOfLines={1}>{item.treatment}</Text>
                      <Text style={s.origPlanQty}>×{item.qty}</Text>
                      <Text style={s.origPlanPrice}>${(item.qty * item.price).toLocaleString()}</Text>
                    </View>
                  ))}
                  <View style={s.origPlanTotalRow}>
                    <Text style={s.origPlanTotalLabel}>Total</Text>
                    <Text style={s.origPlanTotalValue}>
                      ${visitInvoices[0].items.reduce((sum, i) => sum + i.qty * i.price, 0).toLocaleString()}
                    </Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* ── Invoice Ticket ── */}
          <View style={s.invoiceTicket}>
            <LinearGradient colors={["#4A0080", "#6B21A8"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.invoiceTicketTop}>
              <View style={s.invoiceTicketTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.invoiceTicketLabel}>VISIT {currentVisitNum} INVOICE</Text>
                  <Text style={s.invoiceTicketTitle} numberOfLines={1}>{currentVI.description}</Text>
                </View>
                <View style={s.invoiceVisitBadge}>
                  <Text style={s.invoiceVisitEmoji}>🧾</Text>
                </View>
              </View>
            </LinearGradient>

            <View style={s.perfRow}>
              <View style={s.perfNotchL} />
              <View style={s.perfDashes} />
              <View style={s.perfNotchR} />
            </View>

            <View style={s.invoiceTicketBottom}>
              {currentVI.items.length > 0 ? (
                currentVI.items.map((item, i) => (
                  <View key={i} style={s.treatmentRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.treatmentName}>{item.treatment}</Text>
                      <Text style={s.treatmentQty}>Qty: {item.qty}</Text>
                    </View>
                    <Text style={s.treatmentPrice}>${(item.qty * item.price).toLocaleString()}</Text>
                  </View>
                ))
              ) : (
                <View style={s.noTreatmentsBox}>
                  <Text style={{ fontSize: 16 }}>📋</Text>
                  <Text style={s.noTreatmentsText}>No new treatments this visit</Text>
                </View>
              )}

              <View style={s.invoiceDivider} />

              <View style={s.calcSection}>
                {currentVI.visitTotal > 0 && (
                  <View style={s.calcRow}>
                    <Text style={s.calcLabel}>Visit {currentVisitNum} Treatments</Text>
                    <Text style={s.calcValue}>${currentVI.visitTotal.toLocaleString()}</Text>
                  </View>
                )}
                {(currentVI.prevCarryForward || 0) > 0 && (
                  <View style={s.calcRow}>
                    <Text style={[s.calcLabel, { color: C.amber }]}>Previous carry-forward</Text>
                    <Text style={[s.calcValue, { color: C.amber }]}>+${currentVI.prevCarryForward.toLocaleString()}</Text>
                  </View>
                )}
                {currentVI.billingPercent !== undefined && currentVI.billingPercent < 100 && (
                  <>
                    <View style={s.calcRow}>
                      <Text style={[s.calcLabel, { fontWeight: "600" }]}>Billing {currentVI.billingPercent}%</Text>
                      <Text style={[s.calcValue, { fontWeight: "700" }]}>${(currentVI.billedAmount || 0).toLocaleString()}</Text>
                    </View>
                    {(currentVI.deferredAmount || 0) > 0 && (
                      <View style={s.calcRow}>
                        <Text style={[s.calcLabel, { color: C.amber }]}>Deferred to next visit</Text>
                        <Text style={[s.calcValue, { color: C.amber }]}>${currentVI.deferredAmount!.toLocaleString()}</Text>
                      </View>
                    )}
                  </>
                )}
                {(currentVI.appDiscount || 0) > 0 && (
                  <View style={s.calcRow}>
                    <Text style={[s.calcLabel, { color: C.emerald }]}>🎉 5% App Discount</Text>
                    <Text style={[s.calcValue, { color: C.emerald }]}>
                      -${currentVI.appDiscount.toLocaleString()}
                    </Text>
                  </View>
                )}
                {(currentVI.depositDeducted || 0) > 0 && (
                  <View style={s.calcRow}>
                    <Text style={[s.calcLabel, { color: C.emerald }]}>Deposit Applied</Text>
                    <Text style={[s.calcValue, { color: C.emerald }]}>-${currentVI.depositDeducted!.toLocaleString()}</Text>
                  </View>
                )}
              </View>

              <LinearGradient colors={["rgba(74,0,128,0.06)", "rgba(107,33,168,0.04)"]} style={s.amountDueBox}>
                <Text style={s.amountDueLabel}>Visit {currentVisitNum} Due</Text>
                <Text style={s.amountDueValue}>${currentPayAmount.toLocaleString()}</Text>
              </LinearGradient>

              {invoice.notes && (
                <View style={s.notesBox}>
                  <Text style={{ fontSize: 14, marginTop: 1 }}>📝</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.notesTitle}>Doctor's Notes</Text>
                    <Text style={s.notesText}>{invoice.notes}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* ── Payment Method ── */}
          <View style={s.paymentSection}>
            <Text style={s.sectionLabel}>PAYMENT METHOD</Text>

            {/* Saved card — credit card visual */}
            {booking?.savedCard && (
              <TouchableOpacity
                style={[s.cardVisual, useSavedCard && s.cardVisualActive]}
                onPress={() => setUseSavedCard(true)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={useSavedCard ? ["#4A0080", "#6B21A8", "#7c3aed"] : ["#94a3b8", "#64748b"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={s.cardGrad}
                >
                  <View style={s.cardTopRow}>
                    <View style={[s.radioCircle, useSavedCard && s.radioCircleActive]}>
                      {useSavedCard && <View style={s.radioFill} />}
                    </View>
                    <Text style={s.cardBrandText}>{booking.savedCard.brand}</Text>
                    <View style={s.depositTag}>
                      <Text style={s.depositTagText}>Deposit card</Text>
                    </View>
                  </View>
                  <Text style={s.cardNumberText}>
                    ••••    ••••    ••••    {booking.savedCard.last4}
                  </Text>
                  <View style={s.cardBottomRow}>
                    <View>
                      <Text style={s.cardSmallLabel}>CARDHOLDER</Text>
                      <Text style={s.cardSmallValue}>{booking.savedCard.name}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={s.cardSmallLabel}>EXPIRES</Text>
                      <Text style={s.cardSmallValue}>{booking.savedCard.expiry}</Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* New card option */}
            {booking?.savedCard && (
              <TouchableOpacity
                style={[s.newCardOption, !useSavedCard && s.newCardOptionActive]}
                onPress={() => setUseSavedCard(false)}
                activeOpacity={0.7}
              >
                <View style={[s.radioSmall, !useSavedCard && s.radioSmallActive]}>
                  {!useSavedCard && <View style={s.radioSmallFill} />}
                </View>
                <Text style={s.newCardOptionText}>Use a different card</Text>
              </TouchableOpacity>
            )}

            {/* Card form */}
            {(!booking?.savedCard || !useSavedCard) && (
              <View style={s.cardForm}>
                <View style={s.formField}>
                  <Text style={s.formLabel}>CARDHOLDER NAME</Text>
                  <TextInput
                    style={s.formInput}
                    value={cardName}
                    onChangeText={setCardName}
                    placeholder="Full name on card"
                    placeholderTextColor={C.faint}
                    autoCapitalize="words"
                  />
                </View>
                <View style={s.formField}>
                  <Text style={s.formLabel}>CARD NUMBER</Text>
                  <TextInput
                    style={s.formInput}
                    value={cardNumber}
                    onChangeText={(t) => setCardNumber(formatCard(t))}
                    placeholder="1234 5678 9012 3456"
                    placeholderTextColor={C.faint}
                    keyboardType="number-pad"
                    maxLength={19}
                  />
                </View>
                <View style={s.formRow}>
                  <View style={[s.formField, { flex: 1 }]}>
                    <Text style={s.formLabel}>EXPIRY</Text>
                    <TextInput
                      style={s.formInput}
                      value={expiry}
                      onChangeText={(t) => setExpiry(formatExpiry(t))}
                      placeholder="MM/YY"
                      placeholderTextColor={C.faint}
                      keyboardType="number-pad"
                      maxLength={5}
                    />
                  </View>
                  <View style={[s.formField, { flex: 1 }]}>
                    <Text style={s.formLabel}>CVC</Text>
                    <TextInput
                      style={s.formInput}
                      value={cvc}
                      onChangeText={(t) => setCvc(t.replace(/\D/g, "").slice(0, 4))}
                      placeholder="123"
                      placeholderTextColor={C.faint}
                      keyboardType="number-pad"
                      maxLength={4}
                      secureTextEntry
                    />
                  </View>
                </View>
              </View>
            )}

            <View style={s.secureBadge}>
              <Text style={{ fontSize: 12 }}>🔒</Text>
              <Text style={s.secureText}>256-bit SSL encryption · Your payment is secure</Text>
            </View>
          </View>

          {/* Warranty Protection Banner */}
          <View style={s.warrantyBanner}>
            <Text style={s.warrantyBannerIcon}>🛡️</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.warrantyBannerTitle}>Your treatments are protected</Text>
              <Text style={s.warrantyBannerText}>
                By paying through DentaRoute, you get:{"\n"}
                • Up to 5-year treatment warranty{"\n"}
                • US aftercare at partner clinics{"\n"}
                • 5% app payment discount{"\n"}
                • Secure escrow payment
              </Text>
              <Text style={s.warrantyBannerWarn}>
                Direct payment = No warranty, no aftercare
              </Text>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom pay bar */}
      <View style={s.bottomBar}>
        <View>
          <Text style={s.bottomLabel}>Visit {currentVisitNum} Payment</Text>
          <Text style={s.bottomAmount}>${currentPayAmount.toLocaleString()}</Text>
        </View>
        <Animated.View style={{ transform: [{ scale: canPay ? pulseAnim : 1 }] }}>
          <TouchableOpacity
            onPress={handlePay}
            disabled={!canPay || paying}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={canPay ? ["#6B21A8", "#4A0080"] : ["#cbd5e1", "#94a3b8"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.payBtn}
            >
              {paying ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.payBtnText}>Pay ${currentPayAmount.toLocaleString()} →</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════ */
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.cream },

  /* ── Header ── */
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
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  scrollContent: { padding: 20, gap: 20 },

  /* ── Section Label ── */
  sectionLabel: {
    fontSize: 10, fontWeight: "800", color: C.muted, letterSpacing: 1.5,
    marginBottom: 4,
  },

  /* ── Discount Banner ── */
  discountBanner: {
    borderRadius: 16, overflow: "hidden",
    borderWidth: 1, borderColor: "rgba(5,150,105,0.15)",
  },
  discountGrad: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: 16,
  },
  discountIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(5,150,105,0.08)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(5,150,105,0.1)",
  },
  discountTitle: { fontSize: 14, fontWeight: "700", color: "#047857" },
  discountSub: { fontSize: 11, color: C.sub, marginTop: 2 },

  /* ── Visit Progress ── */
  progressCard: {
    backgroundColor: C.card, borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: C.border,
  },
  tlRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  tlDotCol: { width: 20, alignItems: "center" },
  tlDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: C.faint, borderWidth: 2, borderColor: "#e2e8f0",
    alignItems: "center", justifyContent: "center",
  },
  tlDotDone: { backgroundColor: C.emerald, borderColor: C.emerald },
  tlDotCurrent: { backgroundColor: C.violet, borderColor: C.violet },
  tlLine: {
    width: 2, height: 18, backgroundColor: C.border,
    marginLeft: 9,
  },
  tlLabel: { fontSize: 13, fontWeight: "700", color: C.navy },
  tlLabelDone: { color: C.emerald },
  tlLabelCurrent: { color: C.violet },
  tlDesc: { fontSize: 11, color: C.sub, marginTop: 1 },
  tlAmountPaid: { fontSize: 13, fontWeight: "700", color: C.emerald, textDecorationLine: "line-through" },
  tlAmountCurrent: { fontSize: 14, fontWeight: "800", color: C.violet },
  tlAmountUpcoming: { fontSize: 11, color: C.muted, fontStyle: "italic" },
  payNowBadge: {
    backgroundColor: "rgba(107,33,168,0.1)", borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  payNowText: { fontSize: 8, fontWeight: "800", color: C.violet, letterSpacing: 0.5 },
  paidCheck: { fontSize: 11, fontWeight: "600", color: C.emerald },
  paidSummaryRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingTop: 12, marginTop: 8, borderTopWidth: 1, borderTopColor: C.border,
  },
  paidSummaryLabel: { fontSize: 12, fontWeight: "600", color: C.emerald },
  paidSummaryAmount: { fontSize: 14, fontWeight: "800", color: C.emerald },
  remainingHint: {
    fontSize: 11, color: C.muted, textAlign: "center", fontStyle: "italic", marginTop: 8,
  },

  /* ── Original Treatment Plan ── */
  origPlanCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "rgba(107,33,168,0.1)", gap: 4,
    borderLeftWidth: 3, borderLeftColor: C.violet,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  origPlanHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  origPlanTitle: {
    fontSize: 10, fontWeight: "800", color: C.muted, letterSpacing: 1,
  },
  origPlanToggle: { fontSize: 10, color: C.violet },
  origPlanRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: "#f8f5fc",
  },
  origPlanName: { flex: 1, fontSize: 13, fontWeight: "500", color: C.sub },
  origPlanQty: { fontSize: 12, color: C.muted, marginHorizontal: 12, minWidth: 24 },
  origPlanPrice: { fontSize: 13, fontWeight: "600", color: C.sub },
  origPlanTotalRow: {
    flexDirection: "row", justifyContent: "space-between",
    paddingTop: 8, marginTop: 4,
  },
  origPlanTotalLabel: { fontSize: 12, fontWeight: "700", color: C.sub },
  origPlanTotalValue: { fontSize: 13, fontWeight: "800", color: C.navy },

  /* ── No Treatments Box ── */
  noTreatmentsBox: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "rgba(107,33,168,0.03)", borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "rgba(107,33,168,0.08)",
  },
  noTreatmentsText: { fontSize: 13, color: C.sub, fontWeight: "600" },

  /* ── Invoice Ticket ── */
  invoiceTicket: { borderRadius: 20, overflow: "hidden" },
  invoiceTicketTop: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16 },
  invoiceTicketTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  invoiceTicketLabel: { fontSize: 10, fontWeight: "800", color: "rgba(255,255,255,0.55)", letterSpacing: 1.5 },
  invoiceTicketTitle: { fontSize: 16, fontWeight: "800", color: "#fff", marginTop: 3 },
  invoiceVisitBadge: {
    backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 10,
    width: 40, height: 40, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
  },
  invoiceVisitEmoji: { fontSize: 18 },

  perfRow: { flexDirection: "row", alignItems: "center", backgroundColor: C.card, marginTop: -1 },
  perfNotchL: { width: 16, height: 16, borderRadius: 8, backgroundColor: C.cream, marginLeft: -8 },
  perfDashes: { flex: 1, height: 1, borderStyle: "dashed", borderWidth: 1, borderColor: C.border },
  perfNotchR: { width: 16, height: 16, borderRadius: 8, backgroundColor: C.cream, marginRight: -8 },

  invoiceTicketBottom: { backgroundColor: C.card, padding: 20, gap: 10 },
  treatmentRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f8f5fc",
  },
  treatmentName: { fontSize: 14, fontWeight: "600", color: C.navy },
  treatmentQty: { fontSize: 11, color: C.muted, marginTop: 2 },
  treatmentPrice: { fontSize: 14, fontWeight: "700", color: C.plum },
  invoiceDivider: { height: 1, backgroundColor: C.border, marginVertical: 4 },
  calcSection: { gap: 8 },
  calcRow: { flexDirection: "row", justifyContent: "space-between" },
  calcLabel: { fontSize: 13, color: C.sub },
  calcValue: { fontSize: 13, fontWeight: "600", color: C.navy },
  amountDueBox: {
    borderRadius: 14, padding: 18,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderWidth: 1, borderColor: "rgba(107,33,168,0.1)", marginTop: 4,
  },
  amountDueLabel: { fontSize: 14, fontWeight: "700", color: C.plum },
  amountDueValue: { fontSize: 26, fontWeight: "900", color: C.violet },
  notesBox: {
    flexDirection: "row", gap: 10, alignItems: "flex-start",
    backgroundColor: C.cream, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: C.border,
  },
  notesTitle: { fontSize: 12, fontWeight: "700", color: C.navy },
  notesText: { fontSize: 12, color: C.sub, lineHeight: 18, marginTop: 2 },

  /* ── Payment Method ── */
  paymentSection: {
    backgroundColor: C.card, borderRadius: 18, padding: 20,
    borderWidth: 1, borderColor: C.border, gap: 14,
  },

  /* Saved card visual */
  cardVisual: {
    borderRadius: 16, overflow: "hidden", opacity: 0.6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  cardVisualActive: { opacity: 1 },
  cardGrad: { padding: 20, gap: 14 },
  cardTopRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  radioCircle: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  radioCircleActive: { borderColor: "#fff" },
  radioFill: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#fff" },
  cardBrandText: { fontSize: 16, fontWeight: "800", color: "#fff", flex: 1 },
  depositTag: {
    backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  depositTagText: { fontSize: 9, fontWeight: "700", color: "#fff", letterSpacing: 0.3 },
  cardNumberText: {
    fontSize: 17, fontWeight: "600", color: "rgba(255,255,255,0.9)",
    letterSpacing: 2, marginVertical: 4,
  },
  cardBottomRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end",
  },
  cardSmallLabel: { fontSize: 8, fontWeight: "700", color: "rgba(255,255,255,0.45)", letterSpacing: 1 },
  cardSmallValue: { fontSize: 13, fontWeight: "600", color: "#fff", marginTop: 2 },

  /* New card option */
  newCardOption: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, padding: 14,
    borderWidth: 1.5, borderColor: C.border, backgroundColor: C.cream,
  },
  newCardOptionActive: { borderColor: C.violet, backgroundColor: "rgba(107,33,168,0.03)" },
  radioSmall: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: C.faint,
    alignItems: "center", justifyContent: "center",
  },
  radioSmallActive: { borderColor: C.violet },
  radioSmallFill: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: C.violet },
  newCardOptionText: { fontSize: 13, fontWeight: "600", color: C.navy },

  /* Card form */
  cardForm: { gap: 14 },
  formField: { gap: 5 },
  formLabel: { fontSize: 9, fontWeight: "800", color: C.muted, letterSpacing: 1 },
  formInput: {
    backgroundColor: C.cream, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: C.navy,
  },
  formRow: { flexDirection: "row", gap: 12 },

  /* Security badge */
  secureBadge: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.emeraldLight, borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: "rgba(5,150,105,0.1)",
  },
  secureText: { fontSize: 11, color: "#065f46", flex: 1 },

  /* ── Bottom Bar ── */
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40,
    backgroundColor: C.card,
    borderTopWidth: 1, borderTopColor: C.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 8,
  },
  bottomLabel: { fontSize: 11, color: C.muted, fontWeight: "500" },
  bottomAmount: { fontSize: 24, fontWeight: "900", color: C.plum },
  payBtn: { borderRadius: 14, paddingHorizontal: 26, paddingVertical: 16 },
  payBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  /* ── Waiting / No Invoice ── */
  waitingIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(107,33,168,0.06)",
    alignItems: "center", justifyContent: "center", marginBottom: 16,
    borderWidth: 1, borderColor: "rgba(107,33,168,0.1)",
  },
  waitingTitle: { fontSize: 20, fontWeight: "800", color: C.navy, marginBottom: 8 },
  waitingSub: { fontSize: 14, color: C.sub, textAlign: "center", lineHeight: 22 },

  /* ══ Success State ══ */
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

  /* Receipt card */
  receiptCard: { borderRadius: 20, overflow: "hidden", marginTop: 22 },
  receiptHeader: {
    backgroundColor: C.card, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  receiptHeaderLabel: { fontSize: 10, fontWeight: "800", color: C.muted, letterSpacing: 1.5 },
  receiptHeaderDate: { fontSize: 11, fontWeight: "500", color: C.sub },
  receiptBody: { backgroundColor: C.card, padding: 20 },
  receiptRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 10,
  },
  receiptLabel: { fontSize: 13, color: C.sub },
  receiptValue: { fontSize: 14, fontWeight: "600", color: C.navy },
  receiptDivider: { height: 1, backgroundColor: "#f1f5f9" },

  /* Next visit card */
  nextCard: {
    backgroundColor: "rgba(107,33,168,0.04)", borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: "rgba(107,33,168,0.08)", gap: 8,
  },
  nextCardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  nextDotRing: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "rgba(107,33,168,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  nextDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.violet },
  nextCardTitle: { fontSize: 14, fontWeight: "700", color: C.plum },
  nextVisitLabel: { fontSize: 13, fontWeight: "700", color: C.navy },
  nextVisitSub: { fontSize: 11, color: C.sub },
  nextHint: { fontSize: 11, color: C.muted, lineHeight: 16, fontStyle: "italic", marginTop: 4 },

  /* What's next */
  whatsNextCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: C.border, gap: 12,
  },
  whatsNextTitle: { fontSize: 14, fontWeight: "800", color: C.navy, marginBottom: 4 },
  whatsNextRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  whatsNextIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: C.cream, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: C.border,
  },
  whatsNextText: { fontSize: 13, color: C.sub, flex: 1, lineHeight: 18 },

  /* Success actions */
  successActions: { gap: 10, marginTop: 8 },
  actionReview: { borderRadius: 14, overflow: "hidden" },
  actionReviewGrad: { paddingVertical: 16, alignItems: "center" },
  actionReviewText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  actionDash: {
    backgroundColor: C.card, borderRadius: 14, paddingVertical: 16, alignItems: "center",
    borderWidth: 1, borderColor: C.border,
  },
  actionDashText: { fontSize: 15, fontWeight: "600", color: C.navy },

  /* Warranty banner */
  warrantyBanner: {
    flexDirection: "row", gap: 12, padding: 16,
    backgroundColor: "#f0fdf4", borderRadius: 14,
    borderWidth: 1, borderColor: "#bbf7d0", marginTop: 16,
  },
  warrantyBannerIcon: { fontSize: 24, marginTop: 2 },
  warrantyBannerTitle: { fontSize: 14, fontWeight: "700", color: "#15803d", marginBottom: 6 },
  warrantyBannerText: { fontSize: 12, color: "#166534", lineHeight: 20 },
  warrantyBannerWarn: { fontSize: 11, color: "#dc2626", fontWeight: "600", marginTop: 8 },
});
