"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  MapPin,
  Package,
  ReceiptText,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { api, queryString, segment } from "@/lib/api";
import { useBag } from "@/lib/bag";
import { money } from "@/lib/money";
import {
  forgetCheckoutIntent,
  fulfilmentFor,
  orderDisplayLabel,
  orderLabels,
  safeCheckoutUrl,
  missingCheckoutFields,
} from "@/lib/checkout";
import type { FulfilmentStatus, Order } from "@/lib/checkout";
import type { Page } from "@/lib/contracts";
import { useAuth } from "@/providers/app-provider";
import {
  EmptyState,
  ErrorState,
  ImageView,
  Loading,
  Notice,
  Pagination,
} from "@/components/ui";
import { OrderItems } from "./checkout";
import { CheckoutProfileGate } from "./profile-gate";
import { DemoPaymentGuide } from "./demo-payment";

const date = (value: string, time = false) =>
  new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    ...(time ? { timeStyle: "short" as const } : {}),
    timeZone: "Africa/Lagos",
  }).format(new Date(value));
const price = (order: Order) =>
  money(String(order.totalMinor / 100), order.currency);
const itemLabel = (order: Order) => {
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return `${count} ${count === 1 ? "item" : "items"}`;
};
const filters = [
  ["", "All orders"],
  ["PENDING_SHIPPING", "Pending shipping"],
  ["SHIPPED", "Shipped"],
  ["DELIVERED", "Delivered"],
  ["PENDING_PAYMENT", "Awaiting payment"],
  ["ACTION_REQUIRED", "Needs attention"],
] as const;
function StatusBadge({ order }: { order: Order }) {
  return (
    <span
      className={`order-status ${order.status === "PAID" ? "is-paid" : order.status === "PENDING_PAYMENT" ? "is-pending" : "needs-attention"}`}
    >
      <span />
      {orderDisplayLabel(order)}
    </span>
  );
}

export function Orders({ seller = false }: { seller?: boolean }) {
  const auth = useAuth();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const orders = useQuery({
    queryKey: [
      "private",
      auth.user?.id,
      seller ? "seller-orders" : "orders",
      status,
      page,
    ],
    queryFn: async ({ signal }) => {
      const result = await api<Page<Order> | Order[]>(
        `${seller ? "/seller/orders" : "/orders"}${queryString({ page, limit: 8, status: status || undefined })}`,
        { signal },
      );
      if (!Array.isArray(result)) return result;
      const matches = result.filter(
        (order) =>
          !status ||
          (status === "ACTION_REQUIRED"
            ? ["EXPIRED", "CANCELLED", "PAID_REVIEW"].includes(order.status)
            : status === "PENDING_PAYMENT"
              ? order.status === status
              : fulfilmentFor(order) === status),
      );
      return {
        items: matches.slice((page - 1) * 8, page * 8),
        pagination: {
          page,
          limit: 8,
          total: matches.length,
          totalPages: Math.ceil(matches.length / 8),
        },
      };
    },
    enabled: !!auth.user,
  });
  return (
    <section
      className="orders-history"
      aria-label={seller ? "Store orders" : "Order history"}
    >
      <div className="order-history-note">
        <ShieldCheck size={18} />
        <p>
          Your demo purchases, all in one place. Payment is verified before an
          order moves to pending shipping.
        </p>
      </div>
      <div className="order-filters" role="group" aria-label="Filter orders">
        {filters
          .filter(([value]) => !seller || value !== "PENDING_PAYMENT")
          .map(([value, label]) => (
            <button
              key={value}
              className={status === value ? "active" : ""}
              aria-pressed={status === value}
              onClick={() => {
                setStatus(value);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
      </div>
      {orders.isPending ? (
        <Loading />
      ) : orders.error ? (
        <ErrorState
          error={orders.error}
          retry={() => {
            void orders.refetch();
          }}
        />
      ) : !orders.data.items.length ? (
        <EmptyState
          title={status ? "No orders here yet." : "Your orders start here."}
          description={
            status
              ? `Orders marked ${filters.find(([value]) => value === status)?.[1].toLowerCase()} will appear here. Demo orders stop at pending shipping.`
              : seller
                ? "Confirmed test purchases will appear here."
                : "Find something you love. Your order details and progress will be waiting here after checkout."
          }
          action={
            status ? (
              <button
                className="button secondary"
                onClick={() => {
                  setStatus("");
                  setPage(1);
                }}
              >
                Show all orders
              </button>
            ) : (
              <Link className="button" href="/products">
                Discover the marketplace <ArrowRight size={17} />
              </Link>
            )
          }
        />
      ) : (
        <>
          <div className="orders-results-meta">
            <span>
              {orders.data.pagination.total}{" "}
              {orders.data.pagination.total === 1 ? "order" : "orders"}
            </span>
            <span>Newest first</span>
          </div>
          <div className="order-list">
            {orders.data.items.map((order) => (
              <article className="order-history-card" key={order.id}>
                <header>
                  <div>
                    <p className="eyebrow">
                      ORDER #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="muted small-text">
                      Placed {date(order.createdAt)}
                    </p>
                  </div>
                  <StatusBadge order={order} />
                </header>
                <div className="order-history-content">
                  <div className="order-preview-images">
                    {order.items.slice(0, 3).map((item) => (
                      <ImageView
                        key={item.productId}
                        src={item.imageUrl}
                        fallbackSrc={item.fallbackImageUrl}
                        alt={item.title}
                      />
                    ))}
                  </div>
                  <div className="order-preview-copy">
                    {order.seller && (
                      <Link
                        className="order-store"
                        href={`/stores/${segment(order.seller.slug)}`}
                      >
                        {order.seller.displayName} <ArrowRight size={14} />
                      </Link>
                    )}
                    <h2>{order.items[0]?.title || "Your order"}</h2>
                    <p className="muted small-text">
                      {itemLabel(order)}
                      {order.items.length > 1
                        ? ` · +${order.items.length - 1} more ${order.items.length === 2 ? "product" : "products"}`
                        : ""}
                    </p>
                  </div>
                  <div className="order-preview-total">
                    <span className="muted small-text">Order total</span>
                    <strong>{price(order)}</strong>
                  </div>
                </div>
                {seller && (
                  <div className="seller-order-contact">
                    <OrderItems items={order.items} currency={order.currency} />
                    <p>
                      <strong>{order.customerName}</strong> ·{" "}
                      {order.phoneNumber}
                    </p>
                    {order.shippingAddress && (
                      <p>
                        {order.shippingAddress.address},{" "}
                        {order.shippingAddress.city},{" "}
                        {order.shippingAddress.state},{" "}
                        {order.shippingAddress.country}
                      </p>
                    )}
                    {order.status === "PAID_REVIEW" && (
                      <p role="alert">
                        Payment received, but stock needs review. Resolve this
                        order before fulfilment.
                      </p>
                    )}
                  </div>
                )}
                <footer>
                  <span>
                    <Clock3 size={15} />{" "}
                    {order.status === "PAID"
                      ? "Demo delivery · no physical shipment"
                      : orderLabels[order.status]}
                  </span>
                  {!seller && (
                    <Link
                      className="button secondary small"
                      href={`/account/orders/${segment(order.id)}`}
                    >
                      View order details <ArrowRight size={15} />
                    </Link>
                  )}
                </footer>
              </article>
            ))}
          </div>
          <Pagination pagination={orders.data.pagination} onPage={setPage} />
        </>
      )}
    </section>
  );
}

export function OrderDetail({ id }: { id: string }) {
  const auth = useAuth();
  const client = useQueryClient();
  const queryKey = ["private", auth.user?.id, "order", id];
  const order = useQuery({
    queryKey,
    queryFn: ({ signal }) => api<Order>(`/orders/${segment(id)}`, { signal }),
    enabled: !!auth.user,
    refetchInterval: (query) =>
      query.state.data?.status === "PENDING_PAYMENT" ? 5000 : false,
  });
  const verification = useMutation({
    mutationFn: () =>
      api<Order>(
        `/payments/${segment(order.data!.payment!.reference)}/verify`,
        { method: "POST", body: {} },
      ),
    onSuccess: (result) => {
      client.setQueryData(queryKey, result);
      void client.invalidateQueries({
        queryKey: ["private", auth.user?.id, "orders"],
      });
    },
    retry: false,
  });
  if (order.isPending) return <Loading />;
  if (order.error)
    return (
      <ErrorState
        error={order.error}
        retry={() => {
          void order.refetch();
        }}
      />
    );
  return (
    <OrderView
      order={order.data}
      busy={verification.isPending}
      verify={() => verification.mutate()}
      verificationError={verification.error?.message}
    />
  );
}

export function PaymentReturn({ reference }: { reference: string }) {
  const auth = useAuth();
  const client = useQueryClient();
  const result = useQuery({
    queryKey: ["private", auth.user?.id, "payment-return", reference],
    queryFn: ({ signal }) =>
      api<Order>(`/payments/${segment(reference)}/verify`, {
        method: "POST",
        body: {},
        signal,
      }),
    enabled: !!auth.user && !!reference,
    retry: false,
    refetchInterval: (query) =>
      query.state.data?.status === "PENDING_PAYMENT" ? 5000 : false,
  });
  useEffect(() => {
    if (result.data) {
      client.setQueryData(
        ["private", auth.user?.id, "order", result.data.id],
        result.data,
      );
      void client.invalidateQueries({
        queryKey: ["private", auth.user?.id, "orders"],
      });
    }
  }, [result.data, auth.user?.id, client]);
  if (!reference)
    return (
      <Notice>
        No payment reference was supplied.{" "}
        <Link href="/account/orders">Check your orders</Link>.
      </Notice>
    );
  if (result.isPending)
    return (
      <section className="checkout-card payment-checking">
        <span className="order-symbol">
          <ShieldCheck size={28} />
        </span>
        <h1>Confirming your payment.</h1>
        <p className="muted">
          We’re checking securely with Paystack. Keep this page open for your
          order confirmation.
        </p>
        <Loading />
      </section>
    );
  if (result.error)
    return (
      <>
        <ErrorState
          error={result.error}
          retry={() => {
            void result.refetch();
          }}
        />
        <Notice>
          Payment is not confirmed yet.{" "}
          <Link href="/account/orders">Check your orders</Link> before starting
          another payment.
        </Notice>
      </>
    );
  return (
    <OrderView
      order={result.data}
      busy={result.isFetching}
      verify={() => {
        void result.refetch();
      }}
      confirmation
    />
  );
}

const steps: {
  status: FulfilmentStatus;
  label: string;
  icon: typeof Package;
  text: string;
}[] = [
  {
    status: "ORDER_RECEIVED",
    label: "Order received",
    icon: ReceiptText,
    text: "Your payment is confirmed",
  },
  {
    status: "PENDING_SHIPPING",
    label: "Pending shipping",
    icon: Package,
    text: "Awaiting dispatch",
  },
  {
    status: "SHIPPED",
    label: "Shipped",
    icon: Truck,
    text: "On its way to you",
  },
  {
    status: "DELIVERED",
    label: "Delivered",
    icon: CheckCircle2,
    text: "At your doorstep",
  },
];
export function OrderProgress({
  order,
  animate = false,
}: {
  order: Order;
  animate?: boolean;
}) {
  const status = fulfilmentFor(order);
  if (!status) return null;
  const index = steps.findIndex((step) => step.status === status);
  return (
    <section className="order-progress-panel" aria-label="Delivery progress">
      <div className="order-section-heading">
        <div>
          <p className="eyebrow">THE JOURNEY</p>
          <h2>Follow your order.</h2>
        </div>
        <StatusBadge order={order} />
      </div>
      <ol
        className={`order-progress${animate ? " animate-progress" : ""}`}
        style={{ "--order-progress": `${(index / 3) * 100}%` } as CSSProperties}
      >
        {steps.map((step, position) => (
          <li
            key={step.status}
            className={
              position < index
                ? "complete"
                : position === index
                  ? "current"
                  : "upcoming"
            }
            aria-current={position === index ? "step" : undefined}
          >
            <span className="progress-node">
              {position < index ? <Check size={21} /> : <step.icon size={21} />}
            </span>
            <strong>{step.label}</strong>
            <span>
              {position === 0
                ? date(order.paidAt || order.createdAt, true)
                : step.text}
            </span>
            {position === index && <small>Current stage</small>}
          </li>
        ))}
      </ol>
      <p className="demo-progress-note">
        <ShieldCheck size={16} /> Demo tracking stops at pending shipping.
        Shipped and delivered remain inactive; no physical delivery is arranged.
      </p>
    </section>
  );
}

function CombinedOrderView({
  order,
  busy,
  verify,
  resume,
  resuming,
  error,
  confirmation,
}: {
  order: Order;
  busy: boolean;
  verify: () => void;
  resume: () => void;
  resuming: boolean;
  error?: string;
  confirmation: boolean;
}) {
  const paid = order.status === "PAID";
  const parts = order.orders || [];
  return (
    <div className="order-experience combined-order">
      <Link className="text-link" href="/account/orders">
        <ArrowLeft size={15} /> Back to my orders
      </Link>
      <header className={`order-receipt-hero${paid ? " confirmed" : ""}`}>
        <span className="order-symbol">
          {paid ? <CheckCircle2 size={32} /> : <Clock3 size={30} />}
        </span>
        <p className="eyebrow">ONE CHECKOUT. INDEPENDENT STORES.</p>
        <h1 aria-live="polite">{orderLabels[order.status]}</h1>
        <p>
          {paid
            ? "One payment, safely confirmed. Each store has its own order below, so you can follow every delivery separately."
            : order.status === "PENDING_PAYMENT"
              ? "Your items are saved in one checkout. Complete one test payment for all the stores below."
              : order.status === "PAID_REVIEW"
                ? "Your payment was received, but this checkout needs a stock review before any store can fulfil its order."
                : "This checkout is no longer holding stock. If you paid, check the payment status before starting another checkout."}
        </p>
        <div className="order-receipt-meta">
          <span>
            Checkout <strong>#{order.id.slice(0, 8).toUpperCase()}</strong>
          </span>
          <span>
            {parts.length} stores · {itemLabel(order)}
          </span>
          <span>{date(order.createdAt, true)} WAT</span>
        </div>
        {paid && (
          <span className="payment-confirmed-pill">
            <ShieldCheck size={16} /> Test payment verified by Paystack
          </span>
        )}
      </header>
      <div className="combined-checkout-summary">
        <section className="checkout-card">
          <p className="eyebrow">ONE PAYMENT FOR YOUR BAG</p>
          <h2>{price(order)}</h2>
          <p>{parts.length} store orders · Demo delivery: no charge</p>
          {order.payment && (
            <p className="order-reference small-text muted">
              Payment reference
              <br />
              <span>{order.payment.reference}</span>
            </p>
          )}
        </section>
        <section className="checkout-card">
          <p className="eyebrow">DELIVERY DETAILS</p>
          <h2>{order.customerName}</h2>
          <p>{order.phoneNumber}</p>
          {order.shippingAddress && (
            <address>
              {order.shippingAddress.address}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.state}
              <br />
              {order.shippingAddress.country}
            </address>
          )}
        </section>
      </div>
      {parts.map((part) => (
        <section className="checkout-card combined-store-order" key={part.id}>
          <div className="order-section-heading">
            <div>
              <p className="eyebrow">
                STORE ORDER · #{part.id.slice(0, 8).toUpperCase()}
              </p>
              <h2>{part.seller?.displayName || "Independent store"}</h2>
            </div>
            <strong>{price(part)}</strong>
          </div>
          <OrderItems items={part.items} currency={part.currency} />
          <OrderProgress order={part} animate={confirmation} />
          <div className="checkout-actions">
            <Link
              className="text-link"
              href={`/account/orders/${segment(part.id)}`}
            >
              Full order details <ArrowRight size={15} />
            </Link>
            {part.seller && (
              <Link
                className="text-link"
                href={`/stores/${segment(part.seller.slug)}`}
              >
                Visit store <ArrowRight size={15} />
              </Link>
            )}
          </div>
        </section>
      ))}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <div className="checkout-actions order-bottom-actions">
        {order.status === "PENDING_PAYMENT" && order.payment?.checkoutUrl && (
          <button className="button" disabled={resuming} onClick={resume}>
            Continue test payment <ArrowRight size={16} />
          </button>
        )}
        {order.payment && order.payment.status !== "SUCCESS" && (
          <button className="button secondary" disabled={busy} onClick={verify}>
            {busy ? "Checking payment…" : "Check payment status"}
          </button>
        )}
        <Link className="button secondary" href="/account/orders">
          View all orders <ReceiptText size={16} />
        </Link>
        <Link className="button" href="/products">
          Continue exploring <ArrowRight size={16} />
        </Link>
      </div>
      <div className="order-footer-note">
        <ShieldCheck size={20} />
        <p>
          This is a demo checkout. No real money was collected and no physical
          items will be shipped.
        </p>
      </div>
    </div>
  );
}

function OrderView({
  order,
  busy,
  verify,
  verificationError,
  confirmation = false,
}: {
  order: Order;
  busy: boolean;
  verify: () => void;
  verificationError?: string;
  confirmation?: boolean;
}) {
  const auth = useAuth();
  const bag = useBag();
  const cleaned = useRef<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [resumedCheckout, setResumedCheckout] = useState<{
    order: Order;
    url: string;
  } | null>(null);
  const resume = useMutation({
    mutationFn: async () => {
      const result = await api<Order>(`/orders/${segment(order.id)}/resume`, {
        method: "POST",
        body: {},
      });
      if (!result.payment?.checkoutUrl)
        throw new Error("This order cannot resume payment. Check its status.");
      return {
        order: result,
        url: safeCheckoutUrl(result.payment.checkoutUrl),
      };
    },
    onSuccess: (result) => setResumedCheckout(result),
    onError: (error) => {
      if (error.message.toLowerCase().includes("profile"))
        setNeedsProfile(true);
    },
    retry: false,
  });
  useEffect(() => {
    if (auth.user && order.checkoutKey && order.status !== "PENDING_PAYMENT")
      forgetCheckoutIntent(auth.user.id, order.checkoutKey);
  }, [auth.user, order.checkoutKey, order.status]);
  useEffect(() => {
    if (order.status !== "PAID" || cleaned.current === order.id) return;
    try {
      bag.removePurchased(order.items.map((item) => item.productId));
      cleaned.current = order.id;
    } catch {
      /* Payment remains confirmed if device storage is unavailable. */
    }
  }, [order.id, order.status, order.items, bag]);
  if (needsProfile)
    return <CheckoutProfileGate missing={missingCheckoutFields(null)} />;
  if (resumedCheckout && order.status === "PENDING_PAYMENT")
    return (
      <DemoPaymentGuide
        order={resumedCheckout.order}
        checkoutUrl={resumedCheckout.url}
      />
    );
  if (!order.seller)
    return order.orders?.length ? (
      <CombinedOrderView
        order={order}
        busy={busy}
        verify={verify}
        resume={() => resume.mutate()}
        resuming={resume.isPending}
        error={verificationError || resume.error?.message}
        confirmation={confirmation}
      />
    ) : (
      <EmptyState
        title="Your checkout details are being updated."
        description="Refresh this order in a moment to see its stores."
      />
    );
  const paid = order.status === "PAID";
  let checkoutUrl: string | null = null;
  if (order.status === "PENDING_PAYMENT" && order.payment?.checkoutUrl) {
    try {
      checkoutUrl = safeCheckoutUrl(order.payment.checkoutUrl);
    } catch {
      /* Never expose an unsafe payment URL. */
    }
  }
  const messages: Record<Order["status"], string> = {
    PAID: "Thank you for shopping with an independent seller. Your payment is confirmed and your order details are saved below.",
    PENDING_PAYMENT:
      "We’re waiting for Paystack to confirm your payment. If you already paid, check the status before trying again.",
    EXPIRED:
      "Your stock hold has expired. If you already paid, check the payment status so a delayed payment can be resolved.",
    CANCELLED:
      "This payment attempt was not completed. Check its status if you are unsure before starting another order.",
    PAID_REVIEW:
      "Payment was received, but stock could not be allocated. The seller needs to review this test order and arrange a test refund before fulfilment.",
  };
  return (
    <div className="order-experience">
      {!confirmation && (
        <Link className="text-link" href="/account/orders">
          <ArrowLeft size={15} /> Back to my orders
        </Link>
      )}
      <header className={`order-receipt-hero${paid ? " confirmed" : ""}`}>
        <span className="order-symbol">
          {paid ? <CheckCircle2 size={32} /> : <Clock3 size={30} />}
        </span>
        <p className="eyebrow">
          {paid ? "A GOOD FIND. A GREAT CHOICE." : "YOUR PAYMENT & ORDER"}
        </p>
        <h1 aria-live="polite">{orderLabels[order.status]}</h1>
        <p>{messages[order.status]}</p>
        <div className="order-receipt-meta">
          <span>
            Order <strong>#{order.id.slice(0, 8).toUpperCase()}</strong>
          </span>
          <span>{date(order.createdAt, true)} WAT</span>
          <span>{order.seller.displayName}</span>
        </div>
        {paid && (
          <span className="payment-confirmed-pill">
            <ShieldCheck size={16} /> Test payment verified by Paystack
          </span>
        )}
      </header>
      {order.checkoutId && (
        <Notice>
          This store order is part of one{" "}
          {money(
            String((order.checkoutTotalMinor ?? order.totalMinor) / 100),
            order.currency,
          )}{" "}
          payment.{" "}
          <Link href={`/account/orders/${segment(order.checkoutId)}`}>
            View the complete checkout
          </Link>
          .
        </Notice>
      )}
      <OrderProgress order={order} animate={confirmation} />
      <div className="order-receipt-grid">
        <section className="checkout-card order-items-panel">
          <div className="order-section-heading">
            <div>
              <p className="eyebrow">YOUR FINDS</p>
              <h2>What you ordered.</h2>
            </div>
            <span className="muted small-text">{itemLabel(order)}</span>
          </div>
          <OrderItems items={order.items} currency={order.currency} />
          <dl className="checkout-totals">
            <div>
              <dt>Subtotal</dt>
              <dd>{price(order)}</dd>
            </div>
            <div>
              <dt>
                {order.fulfilment === "PICKUP" ? "Collection" : "Demo delivery"}
              </dt>
              <dd>No charge</dd>
            </div>
            <div>
              <dt>Order total</dt>
              <dd>{price(order)}</dd>
            </div>
          </dl>
          <Link
            className="text-link"
            href={`/stores/${segment(order.seller.slug)}`}
          >
            Visit {order.seller.displayName} <ArrowRight size={15} />
          </Link>
        </section>
        <aside className="order-info-panels">
          <section className="checkout-card">
            <span className="order-detail-icon">
              <MapPin size={21} />
            </span>
            <h2>
              {order.shippingAddress ? "Delivery details" : "Contact details"}
            </h2>
            <p>
              <strong>{order.customerName}</strong>
              <br />
              {order.phoneNumber}
            </p>
            {order.shippingAddress ? (
              <address>
                {order.shippingAddress.address}
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.state}
                <br />
                {order.shippingAddress.country}
              </address>
            ) : (
              <p className="muted small-text">
                This earlier collection order did not save a shipping address.
                Collection location: {order.seller.city}, {order.seller.state}.
              </p>
            )}
          </section>
          <section className="checkout-card">
            <span className="order-detail-icon">
              <ReceiptText size={21} />
            </span>
            <h2>Payment summary</h2>
            <dl className="receipt-facts">
              <div>
                <dt>Status</dt>
                <dd>{orderLabels[order.status]}</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>{price(order)}</dd>
              </div>
              {order.paidAt && (
                <div>
                  <dt>Confirmed</dt>
                  <dd>{date(order.paidAt, true)} WAT</dd>
                </div>
              )}
              <div>
                <dt>Method</dt>
                <dd>Paystack · test mode</dd>
              </div>
            </dl>
            {order.payment && (
              <p className="order-reference small-text muted">
                Reference
                <br />
                <span>{order.payment.reference}</span>
              </p>
            )}
          </section>
        </aside>
      </div>
      <div className="order-footer-note">
        <ShieldCheck size={20} />
        <p>
          This is a demo order. No real money was collected, and no physical
          items will be shipped.
        </p>
      </div>
      {verificationError && (
        <p role="alert" className="field-error">
          {verificationError}
        </p>
      )}
      {resume.error && (
        <p role="alert" className="field-error">
          {resume.error.message}
        </p>
      )}
      <div className="checkout-actions order-bottom-actions">
        {checkoutUrl && (
          <button
            className="button"
            disabled={resume.isPending}
            onClick={() => resume.mutate()}
          >
            Continue test payment <ArrowRight size={16} />
          </button>
        )}
        {order.payment && order.payment.status !== "SUCCESS" && (
          <button className="button secondary" disabled={busy} onClick={verify}>
            {busy ? "Checking payment…" : "Check payment status"}
          </button>
        )}
        <Link className="button secondary" href="/account/orders">
          View all orders <ReceiptText size={17} />
        </Link>
        <Link className="button" href="/products">
          Continue exploring <ArrowRight size={17} />
        </Link>
      </div>
      <details className="full-order-reference">
        <summary>Full order reference</summary>
        <p>{order.id}</p>
      </details>
    </div>
  );
}
