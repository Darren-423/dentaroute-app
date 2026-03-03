# Per-Visit 5% Discount 기획서

## 1. 문제점 (현재 시스템)

현재 5% 앱 할인은 **치료 항목 총액(visitTotal)에 먼저 적용**된 후 billing%, 보증금 차감이 이루어진다.

```
현재 계산 순서:
visitTotal → (×0.95) → discountedVisitTotal → (×billing%) → billedAmount → (-deposit) → visitDue
```

이로 인해 **Visit 1에서 전체 할인이 한꺼번에 반영**되고, Visit 2 이후에는 새 치료가 없으면 할인이 $0으로 표시된다.

### 현재 시스템 예시 ($8,000 / 2회 방문 / Visit 1 Billing 50%)

| | Visit 1 | Visit 2 |
|---|---|---|
| 치료 항목 합계 | $8,000 | $0 |
| **5% 할인** | **-$400** | **$0** ← 할인 없어 보임 |
| 할인 후 | $7,600 | $0 |
| Billing 50% | $3,800 | — |
| 이월(carry) | $3,800→V2 | — |
| 결제 기반 금액 | $3,800 | $3,800 (이월) |
| 보증금 차감 | -$800 | $0 |
| **환자 결제** | **$3,000** | **$3,800** |

**문제**: Visit 2에서 환자가 $3,800을 내는데 할인 표시가 없어 불공정하게 느껴짐.

---

## 2. 변경 사항 (신규 시스템)

5% 할인을 치료 항목 총액이 아닌, **각 Visit의 결제 기반 금액(preDiscountPayment)에 적용**한다.

```
신규 계산 순서:
visitTotal → (×billing%) → billedAmount → (+prevCarry) → preDiscountPayment → (×0.95) → afterDiscount → (-deposit) → visitDue
                                        ↘ deferredAmount = carryForward (할인 전 금액으로 이월)
```

### 핵심 변경 포인트

| 항목 | 현재 | 변경 후 |
|---|---|---|
| 5% 할인 적용 대상 | 치료 항목 합계 (visitTotal) | 결제 기반 금액 (billedAmount + prevCarry) |
| carryForward 저장 값 | 할인 후 이월 | **할인 전** 이월 |
| 할인 표시 시점 | Visit 1에 몰림 | **매 Visit 균등하게 표시** |
| 총 할인 금액 | 동일 (5% of 전체 치료비) | 동일 (5% of 전체 치료비) |
| 환자 총 결제 | 동일 | 동일 |

---

## 3. 신규 계산 공식

### VisitInvoice 계산

```
① visitTotal          = Σ(item.qty × item.price)        // 이번 Visit 치료 항목 합계 (할인 없음)
② billingPercent       = 의사 설정 (1~100%, 마지막 Visit은 100% 강제)
③ billedAmount         = visitTotal × billingPercent / 100
④ deferredAmount       = visitTotal - billedAmount
⑤ carryForward         = deferredAmount                  // 할인 전 금액으로 이월

⑥ preDiscountPayment   = billedAmount + prevCarryForward  // 할인 전 결제 기반 금액
⑦ appDiscount          = preDiscountPayment × 5%          // 이번 Visit 할인액
⑧ afterDiscount        = preDiscountPayment - appDiscount

⑨ depositDeducted      = Visit 1만 booking.depositPaid, 나머지 $0
⑩ visitDue             = max(0, afterDiscount - depositDeducted)  // 환자 실제 결제
```

### minBillingPct (Visit 1 최소 billing%)

보증금을 커버해야 하므로:
```
afterDiscount >= depositPaid
(billedAmount × 0.95) >= depositPaid
billedAmount >= depositPaid / 0.95
(visitTotal × billing% / 100) >= depositPaid / 0.95

minBillingPct = ceil((depositPaid / 0.95) / visitTotal × 100)
```

### depositExceedsVisit 체크

```
visitTotal × 0.95 < depositPaid   →  Invoice 발행 불가
```

### 플랫폼 수수료 (변경 없음)

```
platformFee    = visitDue × feeRate
doctorEarnings = visitDue - platformFee
```

### FinalInvoice 누적 계산

```
totalAmount     = 전체 Visit의 치료 항목 합계 (할인 전)
appDiscount     = Σ(각 Visit의 appDiscount)   // = totalAmount × 5% (수학적으로 동일)
discountedTotal = totalAmount - appDiscount
depositPaid     = 보증금
balanceDue      = discountedTotal - depositPaid
```

---

## 4. 상세 예시: $8,000 / 2회 방문 / Visit 1 Billing 50%

### 보증금
- 총 견적가: $8,000
- 보증금 (10%): **$800**

### Visit 1 Invoice

| 단계 | 항목 | 계산 | 금액 |
|:---:|------|------|-----:|
| ① | 치료 항목 합계 (visitTotal) | 전체 치료 입력 | $8,000 |
| ② | Billing % | 의사 설정 | 50% |
| ③ | 청구 금액 (billedAmount) | $8,000 × 50% | $4,000 |
| ④ | 이월 (deferredAmount) | $8,000 - $4,000 | $4,000 |
| ⑤ | carryForward → V2 | = deferredAmount | $4,000 |
| ⑥ | 결제 기반 금액 (preDiscountPayment) | $4,000 + $0 | $4,000 |
| ⑦ | **5% 앱 할인** | **$4,000 × 5%** | **-$200** |
| ⑧ | 할인 후 (afterDiscount) | $4,000 - $200 | $3,800 |
| ⑨ | 보증금 차감 | Visit 1이므로 차감 | -$800 |
| **⑩** | **환자 결제 (visitDue)** | **$3,800 - $800** | **$3,000** |

### Visit 2 Invoice (마지막)

| 단계 | 항목 | 계산 | 금액 |
|:---:|------|------|-----:|
| ① | 치료 항목 합계 (visitTotal) | 새 치료 없음 | $0 |
| ② | Billing % | 마지막 → 100% 강제 | 100% |
| ③ | 청구 금액 (billedAmount) | $0 × 100% | $0 |
| ④⑤ | 이월 | 없음 (마지막) | $0 |
| ⑥ | 결제 기반 금액 (preDiscountPayment) | $0 + $4,000 (V1 이월) | $4,000 |
| ⑦ | **5% 앱 할인** | **$4,000 × 5%** | **-$200** |
| ⑧ | 할인 후 (afterDiscount) | $4,000 - $200 | $3,800 |
| ⑨ | 보증금 차감 | Visit 1에서 이미 처리 | $0 |
| **⑩** | **환자 결제 (visitDue)** | **$3,800 - $0** | **$3,800** |

### 종합 검증

| 구분 | 금액 |
|------|-----:|
| 총 치료비 | $8,000 |
| Visit 1 할인 | -$200 |
| Visit 2 할인 | -$200 |
| **총 할인** | **-$400** (= $8,000 × 5% ✓) |
| **할인 후 총액** | **$7,600** |
| | |
| 보증금 (예약 시) | $800 |
| Visit 1 결제 | $3,000 |
| Visit 2 결제 | $3,800 |
| **환자 총 지출** | **$7,600 ✓** |

---

## 5. 추가 예시: $8,000 / 4회 방문 / Visit 1 Billing 30%

### 보증금: $800

| | Visit 1 | Visit 2 | Visit 3 | Visit 4 (마지막) |
|---|---:|---:|---:|---:|
| **치료 항목 (visitTotal)** | $8,000 | $500 (추가) | $0 | $0 |
| Billing % | 30% | 50% | 100% (자동) | 100% (강제) |
| 청구 금액 (billedAmount) | $2,400 | $250 | $0 | $0 |
| 이월 (deferredAmount) | $5,600 | $250 | $0 | $0 |
| carryForward → 다음 | $5,600 | $250 | $0 | — |
| | | | | |
| 이전 이월 (prevCarry) | $0 | $5,600 | $250 | $0 |
| **결제 기반 (preDiscount)** | **$2,400** | **$5,850** | **$250** | **$0** |
| **5% 할인** | **-$120** | **-$292** | **-$12** | **$0** |
| 할인 후 | $2,280 | $5,558 | $238 | $0 |
| 보증금 차감 | -$800 | $0 | $0 | $0 |
| **환자 결제** | **$1,480** | **$5,558** | **$238** | **$0** |

### 검증
- 총 치료비: $8,000 + $500 = $8,500
- 총 할인: $120 + $292 + $12 + $0 = **$424** (≈ $8,500 × 5% = $425, 반올림 차이 $1)
- 환자 총 지출: $800 + $1,480 + $5,558 + $238 + $0 = **$8,076** (= $8,500 - $424)

> **반올림 처리**: `Math.round()` 사용으로 $1 이내 오차 발생 가능. 마지막 Visit에서 잔여 차이를 조정하거나, 누적 할인 총액을 추적하여 보정.

---

## 6. 수학적 증명: 총 할인 금액 동일성

각 Visit의 할인:
```
Visit_i 할인 = (billedAmount_i + prevCarry_i) × 0.05
```

모든 Visit을 합산하면:
- `Σ billedAmount_i` = 전체 치료비 (모든 billing이 결국 100%로 수렴)
- `Σ prevCarry_i` = `Σ carryForward_i` (이전 Visit의 이월 = 다음 Visit의 prevCarry, 서로 상쇄)

따라서:
```
총 할인 = (Σ billedAmount_i + Σ prevCarry_i) × 0.05
        = (총 치료비 + 0) × 0.05
        = 총 치료비 × 5%
```

**현재 시스템과 총 할인 금액 동일 (반올림 오차 $1 이내)**

---

## 7. VisitInvoice 인터페이스 변경

```typescript
export interface VisitInvoice {
  visit: number;
  description: string;
  items: { treatment: string; qty: number; price: number }[];

  visitTotal: number;           // 이번 Visit 치료 항목 합계 (변경 없음)
  billingPercent: number;       // billing % (변경 없음)
  billedAmount: number;         // visitTotal × billing% (변경: 할인 전 금액 기준)
  deferredAmount: number;       // visitTotal - billedAmount (변경: 할인 전 금액)
  carryForward: number;         // = deferredAmount (변경: 할인 전 금액으로 이월)

  // ── 신규 필드 ──
  preDiscountPayment: number;   // billedAmount + prevCarryForward (할인 전 결제 기반 금액)
  appDiscount: number;          // preDiscountPayment × 5% (이번 Visit 할인액)
  afterDiscount: number;        // preDiscountPayment - appDiscount

  depositDeducted?: number;     // Visit 1만 (변경 없음)
  paymentAmount: number;        // visitDue (변경 없음, 계산 방식만 변경)
  paymentPercent: number;       // legacy (변경 없음)
  paid: boolean;
  paidAt?: string;
}
```

---

## 8. 코드 변경 대상

### 8.1 `app/doctor/final-invoice.tsx` (의사 Invoice 발행)

**변경할 계산 로직** (현재 131~162줄):

```
현재:
  visitTotal → appDiscount(visitTotal×5%) → discountedVisitTotal
  → billedAmount(discountedVisitTotal × billing%) → carryForward
  → visitDue(billedAmount + prevCarry - deposit)

변경:
  visitTotal → billedAmount(visitTotal × billing%) → carryForward(할인 전)
  → preDiscountPayment(billedAmount + prevCarry)
  → appDiscount(preDiscountPayment × 5%) → afterDiscount
  → visitDue(afterDiscount - deposit)
```

**변경할 검증 로직** (minBillingPct, depositExceedsVisit):
```
현재: deposit / discountedVisitTotal
변경: (deposit / 0.95) / visitTotal
```

**변경할 VisitInvoice 생성** (handleSend 내):
- 신규 필드 추가: preDiscountPayment, appDiscount, afterDiscount

### 8.2 `app/patient/final-payment.tsx` (환자 결제)

**변경할 영수증 표시**: 각 Visit에 5% 할인 라인 표시 (현재는 visitTotal 기준)

### 8.3 `lib/store.ts` (데이터 모델)

**VisitInvoice 인터페이스**: 신규 필드 3개 추가

---

## 9. 엣지 케이스

| 케이스 | 처리 |
|--------|------|
| 1회 방문 (Visit 1 = 마지막) | billing 100% 강제. preDiscount = visitTotal, 할인 = visitTotal × 5%. 현재와 동일 결과. |
| Visit 2+에 새 치료 없음 | visitTotal = $0, billedAmount = $0. preDiscount = prevCarry만. prevCarry에 대해 5% 할인 적용. |
| 보증금 > Visit 1 할인후 금액 | `visitTotal × 0.95 < deposit` → Invoice 발행 불가 (현재와 동일). |
| 반올림 오차 | 각 Visit에서 `Math.round()` 사용. 마지막 Visit에서 누적 오차 $1 이내. 허용 범위. |
| prevCarry = $0, 새 치료 = $0 | preDiscount = $0. 할인 = $0. visitDue = $0. Invoice 발행 불필요. |
