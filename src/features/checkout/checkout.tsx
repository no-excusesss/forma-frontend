"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { api, segment } from "@/lib/api";
import { useBag } from "@/lib/bag";
import { money } from "@/lib/money";
import {
  checkoutIntentKey,
  safeCheckoutUrl,
  missingCheckoutFields,
  checkoutProfileFields,
} from "@/lib/checkout";
import type { CheckoutConfig, CheckoutQuote, Order } from "@/lib/checkout";
import { useAuth, useOwnProfile } from "@/providers/app-provider";
import {
  EmptyState,
  ErrorState,
  ImageView,
  Loading,
  Notice,
} from "@/components/ui";
import { CheckoutProfileGate } from "./profile-gate";
import { DemoPaymentGuide } from "./demo-payment";
import type { OwnProfile } from "@/lib/contracts";

export function OrderItems({
  items,
  currency,
}: Pick<Order, "items" | "currency">) {
  return (
    <ul className="checkout-items">
      {items.map((item) => (
        <li key={item.productId}>
          <ImageView
            src={item.imageUrl}
            fallbackSrc={item.fallbackImageUrl}
            alt={item.title}
          />
          <div>
            <Link href={`/products/${segment(item.slug)}`}>{item.title}</Link>
            <span className="muted">Quantity {item.quantity}</span>
          </div>
          <strong>
            {money(
              String((item.unitPriceMinor * item.quantity) / 100),
              currency,
            )}
          </strong>
        </li>
      ))}
    </ul>
  );
}

export function Checkout() {
  const auth = useAuth();
  const profile = useOwnProfile();
  const bag = useBag();
  const selection = bag.ids.join(",");
  const config = useQuery({
    queryKey: ["checkout-config"],
    queryFn: ({ signal }) =>
      api<CheckoutConfig>("/payments/config", { signal }),
    retry: false,
  });
  const quote = useQuery({
    queryKey: ["private", auth.user?.id, "checkout-quote", selection],
    queryFn: ({ signal }) =>
      api<CheckoutQuote>("/checkout/quote", {
        method: "POST",
        body: {
          items: selection
            .split(",")
            .filter(Boolean)
            .map((id) => ({ productId: Number(id), quantity: 1 })),
        },
        signal,
      }),
    enabled: !!auth.user && !!selection && config.data?.enabled === true,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
  if (profile.isPending) return <Loading />;
  if (profile.error)
    return (
      <ErrorState
        error={profile.error}
        retry={() => {
          void profile.refetch();
        }}
      />
    );
  if (!bag.ids.length)
    return (
      <EmptyState
        title="Your bag is empty."
        description="Save a product to start a test checkout."
        action={
          <Link className="button" href="/products">
            Explore products
          </Link>
        }
      />
    );
  if (config.isPending) return <Loading />;
  if (config.error)
    return (
      <ErrorState
        error={config.error}
        retry={() => {
          void config.refetch();
        }}
      />
    );
  if (!config.data.enabled)
    return (
      <Notice>
        Test checkout is not available yet. Please try again later. Your bag is
        saved.
      </Notice>
    );
  const missing = missingCheckoutFields(profile.data);
  if (missing.length) return <CheckoutProfileGate missing={missing} />;
  if (quote.isPending) return <Loading />;
  if (quote.error)
    return (
      <>
        <ErrorState
          error={quote.error}
          retry={() => {
            void quote.refetch();
          }}
        />
        <Link className="text-link" href="/cart">
          Return to your bag
        </Link>
      </>
    );
  return (
    <CheckoutForm
      quote={quote.data}
      profile={profile.data!}
      name={
        profile.data
          ? `${profile.data.firstName} ${profile.data.lastName}`
          : auth.user?.name || ""
      }
      refreshing={quote.isFetching}
      refresh={() => {
        void quote.refetch();
      }}
    />
  );
}

function CheckoutForm({
  quote,
  name,
  profile,
  refreshing,
  refresh,
}: {
  quote: CheckoutQuote;
  name: string;
  profile: OwnProfile;
  refreshing: boolean;
  refresh: () => void;
}) {
  const router = useRouter();
  const auth = useAuth();
  const [customerName, setCustomerName] = useState(name);
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber || "");
  const [savedOrder, setSavedOrder] = useState<Order | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [profileMissing, setProfileMissing] = useState<
    (keyof typeof checkoutProfileFields)[] | null
  >(null);
  const storeLabel =
    quote.seller?.displayName ||
    `${quote.stores?.length || 0} independent stores`;
  const payment = useMutation({
    mutationFn: async () => {
      // Recheck the saved profile immediately before creating a payment.
      const latest = await api<OwnProfile>("/users/me/profile");
      const missing = missingCheckoutFields(latest);
      if (missing.length) {
        setProfileMissing(missing);
        throw new Error("Complete your profile before paying.");
      }
      const signature = JSON.stringify({
        items: quote.items,
        total: quote.totalMinor,
        customerName: customerName.trim(),
        phoneNumber: phoneNumber.trim(),
      });
      const idempotencyKey = checkoutIntentKey(auth.user!.id, signature);
      return api<Order>("/checkout", {
        method: "POST",
        body: {
          quoteToken: quote.quoteToken,
          idempotencyKey,
          customerName: customerName.trim(),
          phoneNumber: phoneNumber.trim(),
        },
      });
    },
    onSuccess: (order) => {
      setSavedOrder(order);
      if (order.status === "PENDING_PAYMENT" && order.payment?.checkoutUrl) {
        try {
          setPaymentUrl(safeCheckoutUrl(order.payment.checkoutUrl));
        } catch {
          router.push(`/account/orders/${segment(order.id)}`);
        }
      } else router.push(`/account/orders/${segment(order.id)}`);
    },
    retry: false,
    onError: (error) => {
      if (error.message.toLowerCase().includes("profile"))
        setProfileMissing(missingCheckoutFields(null));
    },
  });
  if (profileMissing) return <CheckoutProfileGate missing={profileMissing} />;
  if (savedOrder && paymentUrl)
    return <DemoPaymentGuide order={savedOrder} checkoutUrl={paymentUrl} />;
  return (
    <div className="checkout-layout">
      <form
        className="checkout-card"
        onSubmit={(event) => {
          event.preventDefault();
          if (!payment.isPending && !savedOrder) payment.mutate();
        }}
      >
        <p className="eyebrow">YOUR DETAILS</p>
        <h2>Your delivery details.</h2>
        <p className="muted">
          Your order from {storeLabel} will use the shipping address saved in
          your profile.
        </p>
        <div className="field">
          <label htmlFor="checkout-name">Full name</label>
          <input
            id="checkout-name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={160}
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            disabled={payment.isPending || !!savedOrder}
          />
        </div>
        <div className="field">
          <label htmlFor="checkout-phone">Phone number</label>
          <input
            id="checkout-phone"
            type="tel"
            autoComplete="tel"
            required
            minLength={7}
            maxLength={30}
            pattern={"\\+?[0-9 \\(\\)\\-]{7,30}"}
            placeholder="+234 801 234 5678"
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            disabled={payment.isPending || !!savedOrder}
          />
        </div>
        <div className="checkout-address">
          <p className="eyebrow">SHIPPING ADDRESS</p>
          <p>
            {profile.address}
            <br />
            {profile.city}, {profile.state}
            <br />
            {profile.country}
          </p>
          <Link className="text-link" href="/account/profile?checkout=1">
            Edit delivery details
          </Link>
        </div>
        <Notice>
          Paystack test mode. Use a test card. This checkout does not collect
          real money or arrange a physical delivery.
        </Notice>
        {payment.error && (
          <div role="alert" className="field-error">
            <p>{payment.error.message}</p>
            <Link href="/account/profile?checkout=1">
              Review your profile details
            </Link>
            <Link href="/account/orders">
              Check your orders before starting another payment
            </Link>
          </div>
        )}
        <button
          className="button"
          type="submit"
          disabled={payment.isPending || refreshing || !!savedOrder}
        >
          {payment.isPending
            ? "Preparing your test payment…"
            : `Pay ${money(String(quote.totalMinor / 100), quote.currency)} in test mode`}
          <ArrowRight size={17} />
        </button>
        {savedOrder && (
          <Link
            className="text-link"
            href={`/account/orders/${segment(savedOrder.id)}`}
          >
            Open your saved order
          </Link>
        )}
        <p className="checkout-security">
          <ShieldCheck size={16} /> Card details are entered on Paystack’s
          payment page.
        </p>
      </form>
      <aside className="checkout-card checkout-summary">
        <p className="eyebrow">ORDER REVIEW</p>
        <h2>A considered choice.</h2>
        <p>{storeLabel}</p>
        {(quote.stores?.length || 0) > 1 ? (
          <div className="checkout-store-groups">
            <p className="checkout-group-note">
              One payment for your whole bag. Each store receives its own order.
            </p>
            {quote.stores!.map((store) => (
              <section className="checkout-store-group" key={store.seller.id}>
                <div className="checkout-store-heading">
                  <Link href={`/stores/${segment(store.seller.slug)}`}>
                    {store.seller.displayName}
                  </Link>
                  <strong>
                    {money(String(store.totalMinor / 100), quote.currency)}
                  </strong>
                </div>
                <OrderItems items={store.items} currency={quote.currency} />
              </section>
            ))}
          </div>
        ) : (
          <OrderItems items={quote.items} currency={quote.currency} />
        )}
        <dl className="checkout-totals">
          <div>
            <dt>Demo delivery</dt>
            <dd>No charge</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{money(String(quote.totalMinor / 100), quote.currency)}</dd>
          </div>
        </dl>
        <p className="muted small-text">
          Prices are checked before payment. Stock is held for 30 minutes once
          your order is created.
        </p>
        <div className="checkout-actions">
          <button
            type="button"
            className="text-link"
            onClick={refresh}
            disabled={refreshing || payment.isPending || !!savedOrder}
          >
            {refreshing ? "Checking…" : "Refresh prices"}
          </button>
          <Link className="text-link" href="/cart">
            Edit bag
          </Link>
        </div>
      </aside>
    </div>
  );
}
