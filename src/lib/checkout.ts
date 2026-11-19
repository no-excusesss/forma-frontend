export interface CheckoutItem {
  productId: number;
  title: string;
  slug: string;
  quantity: number;
  unitPriceMinor: number;
  imageUrl?: string | null;
  fallbackImageUrl?: string | null;
}
export interface CheckoutSeller {
  id: number;
  displayName: string;
  slug: string;
  city: string;
  state: string;
}
export interface CheckoutQuote {
  items: CheckoutItem[];
  seller: CheckoutSeller | null;
  stores?: {
    seller: CheckoutSeller;
    items: CheckoutItem[];
    totalMinor: number;
  }[];
  currency: "NGN";
  totalMinor: number;
  quoteToken: string;
  expiresAt: number;
  mode: "test";
  fulfilment: "PICKUP" | "DELIVERY";
  shippingMinor: 0;
}
export interface CheckoutConfig {
  enabled: boolean;
  multiStoreCheckout?: boolean;
  mode: "test";
  currency: "NGN";
  fulfilment: "PICKUP" | "DELIVERY";
  shippingMinor: 0;
}
export type OrderStatus =
  "PENDING_PAYMENT" | "PAID" | "EXPIRED" | "CANCELLED" | "PAID_REVIEW";
export interface Order {
  id: string;
  checkoutKey?: string;
  status: OrderStatus;
  currency: "NGN";
  totalMinor: number;
  customerName: string;
  phoneNumber: string;
  shippingAddress?: {
    address: string;
    city: string;
    state: string;
    country: string;
  } | null;
  fulfilmentStatus?: FulfilmentStatus | null;
  seller: CheckoutSeller | null;
  orders?: Order[];
  checkoutId?: string | null;
  checkoutTotalMinor?: number;
  items: CheckoutItem[];
  createdAt: string;
  expiresAt: string;
  paidAt: string | null;
  mode: "test";
  fulfilment: "PICKUP" | "DELIVERY";
  shippingMinor: 0;
  payment: {
    reference: string;
    status: "INITIALIZING" | "PENDING" | "UNKNOWN" | "SUCCESS" | "FAILED";
    checkoutUrl: string | null;
  } | null;
}
export type FulfilmentStatus =
  "ORDER_RECEIVED" | "PENDING_SHIPPING" | "SHIPPED" | "DELIVERED";
export const fulfilmentLabels: Record<FulfilmentStatus, string> = {
  ORDER_RECEIVED: "Order received",
  PENDING_SHIPPING: "Pending shipping",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
};
export function fulfilmentFor(order: Order): FulfilmentStatus | null {
  return order.status === "PAID"
    ? (order.fulfilmentStatus ?? "PENDING_SHIPPING")
    : null;
}
export function orderDisplayLabel(order: Order) {
  const status = fulfilmentFor(order);
  return status ? fulfilmentLabels[status] : orderLabels[order.status];
}
export const checkoutProfileFields = {
  firstName: "First name",
  lastName: "Last name",
  phoneNumber: "Phone number",
  address: "Shipping address",
  city: "City",
  state: "State / region",
  country: "Country",
} as const;
export function missingCheckoutFields(
  profile:
    | Partial<Record<keyof typeof checkoutProfileFields, string | null>>
    | null
    | undefined,
) {
  return (
    Object.keys(checkoutProfileFields) as (keyof typeof checkoutProfileFields)[]
  ).filter(
    (field) =>
      !profile?.[field]?.trim() ||
      (field === "phoneNumber" && !/^\+?[\d ()-]{7,30}$/.test(profile[field]!)),
  );
}
export const orderLabels: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PAID: "Payment confirmed",
  EXPIRED: "Checkout expired",
  CANCELLED: "Payment not completed",
  PAID_REVIEW: "Payment received · review needed",
};
export function safeCheckoutUrl(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "checkout.paystack.com" ||
    url.username ||
    url.password
  )
    throw new Error(
      "The payment link could not be validated. Open your order to try again.",
    );
  return url.href;
}
export function checkoutIntentKey(
  accountId: string,
  signature: string,
): string {
  const storageKey = `forma-checkout-intent-${accountId}`;
  try {
    const previous = JSON.parse(sessionStorage.getItem(storageKey) || "null");
    if (previous?.signature === signature && typeof previous.key === "string")
      return previous.key;
  } catch {
    /* Replace an invalid saved intent below. */
  }
  const key = crypto.randomUUID();
  // Do not silently lose retry protection if browser storage is unavailable.
  sessionStorage.setItem(storageKey, JSON.stringify({ signature, key }));
  return key;
}

export function forgetCheckoutIntent(accountId: string, key: string) {
  const storageKey = `forma-checkout-intent-${accountId}`;
  try {
    const previous = JSON.parse(sessionStorage.getItem(storageKey) || "null");
    if (previous?.key === key) sessionStorage.removeItem(storageKey);
  } catch {
    /* A confirmed order must remain readable if browser storage fails. */
  }
}
