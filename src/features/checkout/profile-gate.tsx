"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, Check, MapPin, ShieldCheck, X } from "lucide-react";
import { checkoutProfileFields } from "@/lib/checkout";

export function CheckoutProfileGate({
  missing,
}: {
  missing: (keyof typeof checkoutProfileFields)[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const description = useId();
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open) dialog.current?.close();
  }, [open]);
  return (
    <>
      <section className="checkout-card profile-check-card">
        <span className="order-symbol">
          <ShieldCheck size={28} />
        </span>
        <p className="eyebrow">BEFORE YOU CHECK OUT</p>
        <h2>A few details, then you’re ready.</h2>
        <p className="muted">
          Add your shipping and contact details to your profile before
          continuing to payment. Your bag is safely saved.
        </p>
        <button className="button" onClick={() => setOpen(true)}>
          Complete my profile <ArrowRight size={17} />
        </button>
        <Link className="text-link" href="/cart">
          Back to my bag
        </Link>
      </section>
      <dialog
        ref={dialog}
        className="dialog profile-check-dialog"
        aria-labelledby={title}
        aria-describedby={description}
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
      >
        <button
          className="icon-button dialog-close"
          aria-label="Close profile reminder"
          onClick={() => setOpen(false)}
        >
          <X size={20} />
        </button>
        <span className="order-symbol">
          <MapPin size={28} />
        </span>
        <p className="eyebrow">LET’S GET YOUR ORDER READY</p>
        <h2 id={title}>Where should it go?</h2>
        <p id={description} className="muted">
          Complete these details so the seller can reach you and prepare your
          order. It only takes a moment.
        </p>
        <ul className="profile-check-list">
          {missing.map((field) => (
            <li key={field}>
              <span>
                <Check size={14} />
              </span>
              {checkoutProfileFields[field]}
            </li>
          ))}
        </ul>
        <p className="field-help">
          <ShieldCheck size={15} /> Your phone number and full address stay
          private. They are shared with the seller for your order.
        </p>
        <Link className="button full-width" href="/account/profile?checkout=1">
          Complete profile & continue <ArrowRight size={17} />
        </Link>
        <button className="text-link" onClick={() => setOpen(false)}>
          I’ll do this later
        </button>
      </dialog>
    </>
  );
}
