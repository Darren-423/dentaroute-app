# 멀티-방문 Billing % 확장 + 의사 할인 숨김 기획서

## 1. 문제점 (현재 시스템)

### 1.1 Billing % 제한

현재 billing%는 **이번 Visit의 새 치료 항목(visitTotal)**에만 적용된다. 이전 Visit에서 이월된 금액(prevCarryForward)은 **무조건 전액 청구**된다.

```
현재:
billedAmount       = visitTotal × billing%              ← 새 치료만 대상
carryForward       = visitTotal - billedAmount           ← 새 치료 잔액만 이월
preDiscountPayment = billedAmount + prevCarryForward     ← 이월금은 전액 강제 포함
```

**예시**: $8,000 / 3회 방문 / Visit 1 billing 30%
- Visit 1: billing 30% of $8,000 → $2,400 billed, $5,600 carry
- Visit 2: $5,600 carry **전액 강제 청구** + 새 치료의 billing%만 조절 가능
- Visit 2에서 carry-forward를 추가로 분할하여 Visit 3으로 보내는 것이 **불가능**

### 1.2 의사에게 5% 할인 노출

현재 의사 UI에 5% 앱 할인이 표시된다:
- Alert 확인 메시지에 `5% App Discount: -$xxx`
- Success 영수증에 할인 라인
- Summary 카드에 할인 라인

**문제**: 5% 앱 할인은 플랫폼이 환자에게 제공하는 혜택이므로, 의사에게 노출할 필요 없음.

---

## 2. 변경 사항 요약

### 2.1 Billing %를 Payable Base에 적용

billing%를 `visitTotal`이 아닌 **payableBase(visitTotal + prevCarryForward)** 전체에 적용한다.

```
변경:
payableBase        = visitTotal + prevCarryForward       // 총 청구 가능 금액
billedAmount       = payableBase × billing% / 100        // 이번 Visit에서 청구
carryForward       = payableBase - billedAmount           // 다음 Visit으로 이월
preDiscountPayment = billedAmount                         // = 청구 금액 그 자체
```

| 항목 | 현재 | 변경 후 |
|---|---|---|
| billing% 적용 대상 | visitTotal (새 치료만) | **payableBase (새 치료 + 이월금)** |
| prevCarryForward 처리 | 전액 강제 포함 | **billing%로 분할 가능** |
| Visit 2+ 이월 분할 | 불가 | **가능** (마지막 Visit 제외) |
| Billing % 슬라이더 표시 조건 | `!isLastVisit && visitTotal > 0` | **`!isLastVisit && payableBase > 0`** |
| preDiscountPayment | billedAmount + prevCarry | **billedAmount** (prevCarry가 이미 payableBase에 포함) |

### 2.2 의사 UI에서 5% 할인 숨김

의사에게는 환자의 5% 앱 할인을 **보여주지 않는다**. 의사가 보는 금액은 **할인 전 금액(full amount)** 기준이다.

| 항목 | 현재 (의사 화면) | 변경 후 |
|---|---|---|
| 5% App Discount 라인 | 표시됨 | **제거** |
| Patient Pays 금액 | afterDiscount − deposit (할인 후) | **preDiscountPayment − deposit (할인 전)** |
| Platform Fee 기준 | visitDue (할인 후) | **doctorViewDue (할인 전)** |
| Doctor Earnings | visitDue − platformFee | **doctorViewDue − platformFee** |
| 5% 할인 비용 부담 | 의사/플랫폼 공동 | **플랫폼 단독 흡수** |

---

## 3. 신규 계산 공식

### 3.1 VisitInvoice 계산

```
① visitTotal          = Σ(item.qty × item.price)              // 이번 Visit 새 치료 합계
② prevCarryForward    = 이전 Visit의 carryForward (Visit 1은 $0)
③ payableBase         = visitTotal + prevCarryForward           // 총 청구 가능 금액

④ billingPercent      = 의사 설정 (1~100%, 마지막 Visit 100% 강제)
⑤ billedAmount        = payableBase × billingPercent / 100
⑥ carryForward        = payableBase - billedAmount              // 다음 Visit으로 이월

⑦ preDiscountPayment  = billedAmount                            // 할인 전 결제 기반 금액
⑧ appDiscount         = preDiscountPayment × 5%                 // 환자 할인액 (의사 비공개)
⑨ afterDiscount       = preDiscountPayment - appDiscount

⑩ depositDeducted     = Visit 1만 booking.depositPaid, 나머지 $0
⑪ patientPayment      = max(0, afterDiscount - depositDeducted) // 환자 실제 결제
```

### 3.2 의사 화면 계산 (할인 없는 세계)

```
⑫ doctorViewDue       = max(0, preDiscountPayment - depositDeducted)  // 의사가 보는 금액
⑬ platformFee         = doctorViewDue × feeRate                       // 의사 기준 수수료
⑭ doctorEarnings      = doctorViewDue - platformFee                   // 의사 수익
```

### 3.3 minBillingPct (Visit 1 최소 billing%)

보증금을 커버해야 하므로:
```
billedAmount × 0.95 >= depositPaid
(payableBase × billing% / 100) × 0.95 >= depositPaid

minBillingPct = ceil((depositPaid / 0.95) / payableBase × 100)
```
> Visit 1에서 payableBase = visitTotal (prevCarry = 0)이므로 현재와 동일한 공식.

### 3.4 depositExceedsVisit 체크

```
payableBase × 0.95 < depositPaid   →  Invoice 발행 불가
```

### 3.5 FinalInvoice 누적 계산 (환자용)

```
totalAmount     = 전체 Visit의 치료 항목 합계 (새 치료만, 할인 전)
appDiscount     = Σ(각 Visit의 appDiscount)
discountedTotal = totalAmount - appDiscount
depositPaid     = 보증금
balanceDue      = discountedTotal - depositPaid
```

---

## 4. 상세 예시: $8,000 / 3회 방문 / V1 30%, V2 50%

### 보증금: $800 (10%)

### Visit 1 (billing 30%)

| 단계 | 항목 | 계산 | 금액 |
|:---:|------|------|-----:|
| ① | 치료 항목 (visitTotal) | 전체 치료 입력 | $8,000 |
| ② | 이전 이월 (prevCarry) | Visit 1 → $0 | $0 |
| ③ | 청구 가능 (payableBase) | $8,000 + $0 | $8,000 |
| ④ | Billing % | 의사 설정 | 30% |
| ⑤ | 청구 금액 (billedAmount) | $8,000 × 30% | $2,400 |
| ⑥ | 이월 → V2 (carryForward) | $8,000 - $2,400 | $5,600 |
| | | | |
| ⑦ | preDiscountPayment | = billedAmount | $2,400 |
| ⑧ | **환자 5% 할인** | $2,400 × 5% | **-$120** |
| ⑨ | 할인 후 (afterDiscount) | $2,400 - $120 | $2,280 |
| ⑩ | 보증금 차감 | Visit 1 | -$800 |
| ⑪ | **환자 결제** | $2,280 - $800 | **$1,480** |
| | | | |
| ⑫ | **의사 화면 결제** | $2,400 - $800 | **$1,600** |
| ⑬ | 플랫폼 수수료 (20%) | $1,600 × 20% | $320 |
| ⑭ | **의사 수익** | $1,600 - $320 | **$1,280** |

### Visit 2 (새 치료 없음, billing 50%)

| 단계 | 항목 | 계산 | 금액 |
|:---:|------|------|-----:|
| ① | 치료 항목 (visitTotal) | 새 치료 없음 | $0 |
| ② | 이전 이월 (prevCarry) | V1에서 이월 | $5,600 |
| ③ | 청구 가능 (payableBase) | $0 + $5,600 | $5,600 |
| ④ | Billing % | 의사 설정 | 50% |
| ⑤ | 청구 금액 (billedAmount) | $5,600 × 50% | $2,800 |
| ⑥ | 이월 → V3 (carryForward) | $5,600 - $2,800 | $2,800 |
| | | | |
| ⑦ | preDiscountPayment | = billedAmount | $2,800 |
| ⑧ | **환자 5% 할인** | $2,800 × 5% | **-$140** |
| ⑨ | 할인 후 | $2,800 - $140 | $2,660 |
| ⑩ | 보증금 차감 | 해당 없음 | $0 |
| ⑪ | **환자 결제** | $2,660 | **$2,660** |
| | | | |
| ⑫ | **의사 화면 결제** | $2,800 | **$2,800** |
| ⑬ | 플랫폼 수수료 (20%) | $2,800 × 20% | $560 |
| ⑭ | **의사 수익** | $2,800 - $560 | **$2,240** |

### Visit 3 (마지막, billing 100% 강제)

| 단계 | 항목 | 계산 | 금액 |
|:---:|------|------|-----:|
| ① | 치료 항목 (visitTotal) | 새 치료 없음 | $0 |
| ② | 이전 이월 (prevCarry) | V2에서 이월 | $2,800 |
| ③ | 청구 가능 (payableBase) | $0 + $2,800 | $2,800 |
| ④ | Billing % | 마지막 → 100% 강제 | 100% |
| ⑤ | 청구 금액 (billedAmount) | $2,800 × 100% | $2,800 |
| ⑥ | 이월 (carryForward) | $0 (마지막) | $0 |
| | | | |
| ⑦ | preDiscountPayment | = billedAmount | $2,800 |
| ⑧ | **환자 5% 할인** | $2,800 × 5% | **-$140** |
| ⑨ | 할인 후 | $2,800 - $140 | $2,660 |
| ⑩ | 보증금 차감 | 해당 없음 | $0 |
| ⑪ | **환자 결제** | $2,660 | **$2,660** |
| | | | |
| ⑫ | **의사 화면 결제** | $2,800 | **$2,800** |
| ⑬ | 플랫폼 수수료 (20%) | $2,800 × 20% | $560 |
| ⑭ | **의사 수익** | $2,800 - $560 | **$2,240** |

---

## 5. 종합 검증

### 환자 검증

| 구분 | 금액 |
|------|-----:|
| 총 치료비 | $8,000 |
| V1 할인 | -$120 |
| V2 할인 | -$140 |
| V3 할인 | -$140 |
| **총 할인** | **-$400** (= $8,000 × 5% ✓) |
| **할인 후 총액** | **$7,600** |
| | |
| 보증금 (예약 시) | $800 |
| V1 결제 | $1,480 |
| V2 결제 | $2,660 |
| V3 결제 | $2,660 |
| **환자 총 지출** | **$7,600 ✓** |

### 의사 검증

| 구분 | 금액 |
|------|-----:|
| V1 의사 화면 Patient Pays | $1,600 |
| V2 의사 화면 Patient Pays | $2,800 |
| V3 의사 화면 Patient Pays | $2,800 |
| **의사가 보는 총액** | **$7,200** |
| | |
| V1 수익 | $1,280 |
| V2 수익 | $2,240 |
| V3 수익 | $2,240 |
| **의사 총 수익** | **$5,760** (= $7,200 × 80% ✓) |
| **플랫폼 수수료 (의사 기준)** | **$1,440** (= $7,200 × 20% ✓) |

> **의사에게는 할인이 없는 세계**: 의사는 $7,200 기준으로 20% 수수료를 지불하고 $5,760을 수익으로 인식.

### 플랫폼 실제 수익

| 구분 | 금액 |
|------|-----:|
| 환자 총 지불 | $7,600 |
| 의사 총 수익 | -$5,760 |
| **플랫폼 실수익** | **$1,840** |
| 의사 기준 수수료 합계 | $1,440 |
| **플랫폼 추가 수익 (= 할인 전 기준 차액)** | **$400** |

> 플랫폼은 환자에게 5% 할인($400)을 제공하지만, 의사 수수료를 할인 전 금액 기준으로 계산하므로 이 비용을 상쇄. 실질적으로 의사가 할인 비용을 수수료를 통해 부담하되, 의사는 할인의 존재를 인지하지 못함.

---

## 6. 수학적 증명: 총 할인 금액 동일성

각 Visit의 할인:
```
Visit_i 할인 = billedAmount_i × 0.05
```

모든 Visit을 합산하면:
```
Σ billedAmount_i = grandTotal  (마지막 Visit에서 carry가 0으로 수렴)
```

따라서:
```
총 할인 = Σ(billedAmount_i × 0.05)
        = (Σ billedAmount_i) × 0.05
        = grandTotal × 5%
```

**Billing % 분할 방식과 무관하게 총 할인 금액은 항상 치료비 총액의 5%**

---

## 7. VisitInvoice 인터페이스 변경

```typescript
export interface VisitInvoice {
  visit: number;
  description: string;
  items: { treatment: string; qty: number; price: number }[];

  visitTotal: number;           // 이번 Visit 새 치료 항목 합계 (변경 없음)
  prevCarryForward: number;     // ★ 신규: 이전 Visit에서 이월받은 금액 (Visit 1은 0)
  billingPercent: number;       // billing % — 이제 payableBase에 적용 (변경)
  billedAmount: number;         // (visitTotal + prevCarry) × billing% (변경)
  deferredAmount: number;       // (visitTotal + prevCarry) - billedAmount (변경)
  carryForward: number;         // = deferredAmount (변경)

  preDiscountPayment: number;   // = billedAmount (변경: 더 이상 prevCarry 별도 합산 안 함)
  appDiscount: number;          // preDiscountPayment × 5%
  afterDiscount: number;        // preDiscountPayment - appDiscount

  depositDeducted?: number;     // Visit 1만 (변경 없음)
  paymentAmount: number;        // 환자 실제 결제 (afterDiscount - deposit)
  paymentPercent: number;       // legacy (변경 없음)
  paid: boolean;
  paidAt?: string;
}
```

### 변경된 필드 의미

| 필드 | 이전 의미 | 신규 의미 |
|------|----------|----------|
| `prevCarryForward` | (없음) | **신규**: 이전 Visit carryForward |
| `billingPercent` | visitTotal에 적용 | **payableBase**에 적용 |
| `billedAmount` | visitTotal × billing% | **(visitTotal + prevCarry) × billing%** |
| `deferredAmount` | visitTotal - billedAmount | **(visitTotal + prevCarry) - billedAmount** |
| `carryForward` | = deferredAmount (동일) | = deferredAmount (동일) |
| `preDiscountPayment` | billedAmount + prevCarry | **= billedAmount** (prevCarry가 이미 포함) |

---

## 8. 코드 변경 대상

### 8.1 `app/doctor/final-invoice.tsx` (의사 Invoice 발행)

#### 8.1.1 계산 로직 변경 (131~166줄)

```
현재:
  billedAmount       = visitTotal × billing%
  carryForward       = visitTotal - billedAmount
  preDiscountPayment = billedAmount + prevCarryForward
  appDiscount        = preDiscountPayment × 5%
  afterDiscount      = preDiscountPayment - appDiscount
  visitDue           = afterDiscount - deposit
  platformFee        = visitDue × feeRate
  doctorEarnings     = visitDue - platformFee

변경:
  payableBase        = visitTotal + prevCarryForward
  billedAmount       = payableBase × billing%
  carryForward       = payableBase - billedAmount
  preDiscountPayment = billedAmount
  appDiscount        = preDiscountPayment × 5%          // 저장용 (의사에게 비공개)
  afterDiscount      = preDiscountPayment - appDiscount
  patientPayment     = afterDiscount - deposit           // 환자 실결제 (저장용)
  doctorViewDue      = preDiscountPayment - deposit      // 의사 화면용 (할인 없음)
  platformFee        = doctorViewDue × feeRate           // 할인 전 기준
  doctorEarnings     = doctorViewDue - platformFee
```

#### 8.1.2 minBillingPct 변경

```
현재: ceil((deposit / 0.95) / visitTotal × 100)
변경: ceil((deposit / 0.95) / payableBase × 100)
      (Visit 1에서는 payableBase = visitTotal이므로 결과 동일)
```

#### 8.1.3 Billing % 슬라이더 표시 조건

```
현재: !isLastVisit && visitTotal > 0
변경: !isLastVisit && payableBase > 0
```

#### 8.1.4 Alert 확인 메시지

- `5% App Discount` 라인 **제거**
- `Patient Pays` → `doctorViewDue` 사용 (할인 전)
- `Platform Fee`, `Your Earnings` → `doctorViewDue` 기준

#### 8.1.5 Success 영수증

- `5% App Discount` 라인 **제거**
- `Patient Pays` → `doctorViewDue` 표시
- Summary 카드에서 할인 라인 **제거**

#### 8.1.6 VisitInvoice 생성 (handleSend)

- 신규 필드 `prevCarryForward` 추가
- `paymentAmount: patientPayment` (환자 실결제, 할인 후)
- 기타 필드 신규 계산 공식 반영

#### 8.1.7 Summary 카드 (778~850줄)

- `payableBase` 정보 표시 (새 치료 + 이월 합계)
- `5% App Discount` 라인 **제거**
- `Patient Pays` → `doctorViewDue`

### 8.2 `app/patient/final-payment.tsx` (환자 결제)

- Invoice Ticket: `prevCarryForward`를 VisitInvoice에서 직접 읽기 (이전 Visit 조회 불필요)
- Success Receipt: 동일하게 `prevCarryForward` 사용
- billing% 표시가 payableBase 기준임을 반영
- 환자 쪽은 5% 할인 표시 **유지** (변경 없음)

### 8.3 `lib/store.ts` (데이터 모델)

- `VisitInvoice` 인터페이스에 `prevCarryForward: number` 추가

### 8.4 `app/doctor/earnings.tsx` (의사 수익)

- `rawAmt` 계산에서 `discountedTotal` 대신 `totalAmount` 기준으로 변경
- 의사 수익 = 할인 전 금액 × doctorShare

---

## 9. 의사 화면 UI 변화 예시

### 9.1 Visit 2 Summary 카드 (변경 전)

```
VISIT 2 SUMMARY
────────────────────────────
Previous Carry-forward     + $5,600
5% App Discount            - $280    ← 제거
────────────────────────────
Patient Pays                 $5,320  ← 할인 후
Platform Fee (20%)           $1,064
Your Earnings                $4,256
```

### 9.2 Visit 2 Summary 카드 (변경 후, billing 50%)

```
VISIT 2 SUMMARY
────────────────────────────
Previous Carry-forward       $5,600
Billing 50%                  $2,800
Deferred to next            $2,800
────────────────────────────
Patient Pays                 $2,800  ← 할인 전 금액
Platform Fee (20%)           $560
Your Earnings                $2,240
```

> **차이점**: 5% 할인 라인 없음, billing% 적용으로 분할 가능, 금액이 할인 전 기준.

---

## 10. 엣지 케이스

| 케이스 | 처리 |
|--------|------|
| 1회 방문 (Visit 1 = 마지막) | billing 100% 강제. payableBase = visitTotal. 현재와 동일 결과 (할인만 숨김). |
| Visit 2+ 새 치료 없음 | visitTotal = $0. payableBase = prevCarryForward만. billing%로 분할 가능. |
| Visit 2+ 새 치료 있음 | payableBase = newTreatments + prevCarry. 전체에 billing% 적용. |
| billing% = 1% (최소) | payableBase × 1% 청구. 나머지 99% 이월. 허용 (마지막 Visit 아닌 경우). |
| 의사가 100% billing (비-마지막) | 허용. 다음 Visit에 carry = $0. 다음 Visit은 새 치료 없으면 $0 invoice. |
| 보증금 > payableBase × 0.95 | Invoice 발행 불가 (Visit 1). 현재와 동일. |
| 반올림 오차 | `Math.round()` 사용. 마지막 Visit에서 $1 이내 오차 허용. |
| 의사 earnings 화면 | `discountedTotal` 대신 `totalAmount` 기준으로 의사 수익 계산. |
| prevCarry = $0 & visitTotal = $0 | payableBase = $0. Invoice 발행 불필요. |
