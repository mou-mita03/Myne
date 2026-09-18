/** Shared contract for a server-side commerce implementation.
 * Never create, confirm, or grant an entitlement from client code. */
export const paymentProviders = ["bkash", "nagad", "card"] as const;
export type PaymentProvider = typeof paymentProviders[number];
export type PaymentStatus = "created" | "pending" | "paid" | "failed" | "refunded";
export type TransactionRecord = {
  amount: number;
  bookId: number;
  currency: "BDT";
  id: string;
  provider: PaymentProvider;
  providerReference?: string;
  status: PaymentStatus;
  userId: string;
  createdAt: string;
};

export function isPaymentProvider(value: string): value is PaymentProvider {
  return paymentProviders.includes(value as PaymentProvider);
}
