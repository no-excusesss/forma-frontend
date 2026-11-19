import assert from "node:assert/strict";
import test from "node:test";
import {
  checkoutIntentKey,
  forgetCheckoutIntent,
  safeCheckoutUrl,
} from "../src/lib/checkout";

test("payment navigation accepts only Paystack HTTPS checkout links", () => {
  assert.equal(
    safeCheckoutUrl("https://checkout.paystack.com/test-code"),
    "https://checkout.paystack.com/test-code",
  );
  for (const url of [
    "javascript:alert(1)",
    "http://checkout.paystack.com/test",
    "https://checkout.paystack.com.attacker.example/test",
    "https://attacker.example/test",
    "https://someone@checkout.paystack.com/test",
  ])
    assert.throws(() => safeCheckoutUrl(url));
});

test("retries reuse their intent while a finished order allows a fresh purchase without clearing another checkout", () => {
  const saved = new Map<string, string>();
  const previous = Object.getOwnPropertyDescriptor(
    globalThis,
    "sessionStorage",
  );
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => saved.set(key, value),
      removeItem: (key: string) => saved.delete(key),
    },
  });
  try {
    const first = checkoutIntentKey("buyer", "same purchase");
    assert.equal(checkoutIntentKey("buyer", "same purchase"), first);
    forgetCheckoutIntent("buyer", "another-order-key");
    assert.equal(checkoutIntentKey("buyer", "same purchase"), first);
    forgetCheckoutIntent("buyer", first);
    assert.notEqual(checkoutIntentKey("buyer", "same purchase"), first);
    assert.notEqual(checkoutIntentKey("another-buyer", "same purchase"), first);
  } finally {
    if (previous) Object.defineProperty(globalThis, "sessionStorage", previous);
    else Reflect.deleteProperty(globalThis, "sessionStorage");
  }
});
