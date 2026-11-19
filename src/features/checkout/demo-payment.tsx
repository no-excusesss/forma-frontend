"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { api, segment } from "@/lib/api";
import { money } from "@/lib/money";
import { safeCheckoutUrl, type Order } from "@/lib/checkout";
import { useAuth } from "@/providers/app-provider";
import { ImageView } from "@/components/ui";

// Public Paystack test data, never a customer's card or a merchant API key.
// https://paystack.com/docs/payments/test-payments/
const demoFields = [
  {
    id: "number",
    label: "Card number",
    display: "4084 0840 8408 4081",
    copy: "4084084084084081",
  },
  { id: "expiry", label: "Expiry", display: "12/35", copy: "12/35" },
  { id: "cvv", label: "CVV", display: "408", copy: "408" },
] as const;

export function DemoCardDetails() {
  const [copied, setCopied] = useState("");
  const [message, setMessage] = useState("");
  const values = useRef<Record<string, HTMLElement | null>>({});
  async function copy(field: (typeof demoFields)[number]) {
    try {
      await navigator.clipboard.writeText(field.copy);
      setCopied(field.id);
      setMessage(`${field.label} copied.`);
    } catch {
      const value = values.current[field.id];
      if (value) {
        const range = document.createRange();
        range.selectNodeContents(value);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      setCopied("");
      setMessage(
        `Copy isn’t available in this browser. Select and copy the ${field.label.toLowerCase()} shown above.`,
      );
    }
  }
  return (
    <section
      className="demo-card-details"
      aria-label="Paystack demo card details"
    >
      <div className="demo-card-heading">
        <span className="demo-card-icon">
          <CreditCard size={23} />
        </span>
        <div>
          <p className="eyebrow">YOUR DEMO CARD</p>
          <h3>A test drive. No real money.</h3>
        </div>
        <span className="demo-test-pill">TEST ONLY</span>
      </div>
      <p className="demo-card-intro">
        Use these public test details on Paystack. This card succeeds without a
        PIN or OTP. Please don’t enter your own card.
      </p>
      <dl className="demo-card-fields">
        {demoFields.map((field) => (
          <div
            key={field.id}
            className={`demo-card-field demo-card-${field.id}`}
          >
            <dt>{field.label}</dt>
            <dd>
              <code
                ref={(element) => {
                  values.current[field.id] = element;
                }}
              >
                {field.display}
              </code>
              <button
                type="button"
                aria-label={`Copy ${field.label.toLowerCase()}`}
                onClick={() => {
                  void copy(field);
                }}
              >
                {copied === field.id ? <Check size={15} /> : <Copy size={15} />}
                <span>{copied === field.id ? "Copied" : "Copy"}</span>
              </button>
            </dd>
          </div>
        ))}
      </dl>
      <p className="demo-expiry-note">
        Any future expiry works. If Paystack asks for a PIN or OTP, check that
        you entered the card number above.
      </p>
      <div className="demo-copy-feedback" role="status" aria-live="polite">
        {message}
      </div>
      <a
        className="text-link demo-card-source"
        href="https://paystack.com/docs/payments/test-payments/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Official Paystack test details <ExternalLink size={12} />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </section>
  );
}

export function DemoPaymentGuide({
  order,
  checkoutUrl,
}: {
  order: Order;
  checkoutUrl: string;
}) {
  const auth = useAuth();
  const router = useRouter();
  const [opened, setOpened] = useState(false);
  const guide = useRef<HTMLElement>(null);
  const current = useQuery({
    queryKey: ["private", auth.user?.id, "order", order.id],
    queryFn: ({ signal }) =>
      api<Order>(`/orders/${segment(order.id)}`, { signal }),
    enabled: !!auth.user && order.mode === "test",
    initialData: order,
    staleTime: 0,
    refetchInterval: (query) =>
      query.state.data?.status === "PENDING_PAYMENT" ? 5000 : false,
  });
  useEffect(() => {
    guide.current?.focus({ preventScroll: true });
    guide.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, []);
  useEffect(() => {
    if (current.data.status !== "PENDING_PAYMENT")
      router.replace(`/account/orders/${segment(order.id)}`);
  }, [current.data.status, order.id, router]);
  let href: string | null = null;
  try {
    href = safeCheckoutUrl(checkoutUrl);
  } catch {
    /* Never render an untrusted payment link. */
  }
  if (
    order.mode !== "test" ||
    !href ||
    !order.payment ||
    current.data.status !== "PENDING_PAYMENT"
  )
    return (
      <div className="checkout-card">
        <h2>Check your order before continuing.</h2>
        <Link className="button" href={`/account/orders/${segment(order.id)}`}>
          Open order <ArrowRight size={16} />
        </Link>
      </div>
    );
  const checkUrl = `/checkout/return?reference=${segment(order.payment.reference)}`;
  return (
    <section
      className="demo-payment-guide"
      ref={guide}
      tabIndex={-1}
      aria-labelledby="demo-payment-title"
    >
      <header className="demo-payment-intro">
        <span className="demo-test-pill">
          <ShieldCheck size={13} /> DEMO CHECKOUT
        </span>
        <h2 id="demo-payment-title">
          Try the checkout.
          <br />
          <em>We’ve got the card.</em>
        </h2>
        <p>
          Your order is saved. Use the test card below to explore the payment
          experience. No real money will be taken and no physical delivery is
          arranged.
        </p>
      </header>
      <div className="demo-payment-layout">
        <DemoCardDetails />
        <div className="demo-payment-steps">
          <p className="eyebrow">THREE LITTLE STEPS</p>
          <ol>
            <li>
              <span>01</span>
              <div>
                <strong>Copy the demo card number.</strong>
                <p>
                  Use expiry <b>12/35</b> and CVV <b>408</b>. No PIN or OTP is
                  needed.
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Open Paystack and choose Card.</strong>
                <p>
                  It opens in a new tab. Keep this guide open so you can come
                  back and copy each detail.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Finish the test payment.</strong>
                <p>
                  Paystack returns you to your order. We’ll confirm the payment
                  with the server before showing success.
                </p>
              </div>
            </li>
          </ol>
          <a
            className="button demo-open-paystack"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpened(true)}
          >
            {opened ? "Reopen Paystack checkout" : "Open Paystack checkout"}
            <ExternalLink size={16} />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          {opened && (
            <p className="demo-opened-note" role="status">
              Paystack opened in another tab. If it didn’t open, allow a new tab
              or follow the link again. Your card details stay here.
            </p>
          )}
          <Link className="button secondary demo-check-payment" href={checkUrl}>
            Check payment status <ArrowRight size={16} />
          </Link>
          <p className="demo-payment-note">
            Already paid? Check the status rather than starting another order.
          </p>
        </div>
      </div>
      <footer className="demo-order-summary">
        <ImageView
          src={order.items[0]?.imageUrl}
          fallbackSrc={order.items[0]?.fallbackImageUrl}
          alt={order.items[0]?.title || "Order item"}
        />
        <div>
          <span>
            YOUR SAVED {order.orders?.length ? "CHECKOUT" : "ORDER"} ·{" "}
            {order.seller?.displayName ||
              `${order.orders?.length || 0} independent stores`}
          </span>
          <strong>
            {order.items.reduce((sum, item) => sum + item.quantity, 0)}{" "}
            {order.items.reduce((sum, item) => sum + item.quantity, 0) === 1
              ? "item"
              : "items"}{" "}
            · {money(String(order.totalMinor / 100), order.currency)}
          </strong>
        </div>
        <Link
          className="text-link"
          href={`/account/orders/${segment(order.id)}`}
        >
          View order details <ArrowRight size={14} />
        </Link>
      </footer>
    </section>
  );
}
