# Deploy Forma's frontend to Vercel

The Next.js frontend runs on Vercel. Your NestJS backend, database connection, payment verification, webhooks and email worker stay on Render.

## 1. Add these two Vercel environment variables

```dotenv
NEXT_PUBLIC_API_URL=/backend
API_UPSTREAM_URL=https://forma-backend-o0cy.onrender.com
```

These are all the environment variables this frontend currently needs. They are also in the public template `.env.vercel.example`. Add them to **Production** before deploying. Enter values without quotes, spaces at the ends, or an extra `/backend` on the upstream URL.

`NEXT_PUBLIC_API_URL` tells the browser to make API requests to its own site's `/backend` path. `API_UPSTREAM_URL` tells Next.js where to forward those requests. `next.config.ts` already contains the rewrite. Keeping requests on the frontend origin lets session cookies work without relying on third-party cookies between Vercel and Render.

Do not add `PAYSTACK_SECRET_KEY`, `PAYSTACK_WEBHOOK_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `ORDER_EMAIL_FROM` or `ORDER_NOTIFICATION_TEST_EMAIL` to Vercel. They remain in the Render backend's environment. This hosted-checkout flow does not need a Paystack public key in the frontend. Vercel manages `NODE_ENV` and `PORT`.

Environment changes apply to new deployments: redeploy after changing them. See [Vercel's environment-variable guide](https://vercel.com/docs/environment-variables).

## 2. Put the frontend on GitHub

Create a separate empty repository under your GitHub account, for example `forma-frontend`. Keep the existing `forma-backend` repository for NestJS. The commands below assume the new repository has that example name; replace the URL if you choose another name.

In a terminal at `C:\Users\HP\Desktop\shoptesting`:

```powershell
git init -b main
git add .
git status --short
```

Check that `.env.local`, `.env.render`, `.env.demo-sellers`, `node_modules`, `.next`, `.payment-work` and `test-results` are absent. The project's `.gitignore` excludes them. `.env.example` and `.env.vercel.example` are safe public templates and should be present.

Then commit and push:

```powershell
git commit -m "Prepare Forma marketplace for Vercel"
git remote add origin https://github.com/no-excusesss/forma-frontend.git
git push -u origin main
```

Sign in to GitHub if Git requests it. These commands are for a new repository; if you already initialized Git or added `origin`, use your existing setup instead.

## 3. Import into Vercel

1. In Vercel, choose **Add New → Project** and import the frontend GitHub repository.
2. Use framework preset **Next.js** and root directory **`.`** (the folder containing `package.json`).
3. Use install command **`npm ci`** and build command **`npm run build`**. Leave the output directory at Vercel's default. No custom start command is needed.
4. Add the two environment variables from section 1 to Production, then deploy.
5. Copy the stable production address Vercel gives you, such as `https://your-project.vercel.app`.

The package and lockfile both specify Node **22.x**, which Vercel supports. See [Node version selection](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions) and [GitHub deployments](https://vercel.com/docs/git/vercel-for-github).

## 4. Connect the new frontend origin on Render

After Vercel gives you the actual URL, update these **on Render**, replacing the example origin with your exact production address:

```dotenv
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3101,https://your-project.vercel.app
CHECKOUT_FRONTEND_URL=https://your-project.vercel.app
```

Use origins only: `https://your-project.vercel.app`, without a path or trailing slash. Preserve other exact trusted origins you still use. Save and redeploy the backend so the new settings take effect. `CHECKOUT_FRONTEND_URL` must be the site origin; the backend adds `/checkout/return` itself.

Keep `BETTER_AUTH_URL` pointing at the backend, or leave it unset so the backend uses Render's `RENDER_EXTERNAL_URL`. Do not replace it with the Vercel frontend address. Keep authentication, CSRF and Origin checks enabled.

The Paystack webhook remains:

```text
https://forma-backend-o0cy.onrender.com/payments/paystack/webhook
```

If Paystack's dashboard has a separately configured callback URL, update it to `https://your-project.vercel.app/checkout/return`. The backend supplies that callback during transaction initialization. New orders use the updated address; checkout links created before the change may still carry their old callback, so create a fresh demo order for deployment verification.

## 5. Check the published demo

1. Open `/backend/health` on your Vercel site. It should reach the Render health endpoint.
2. Open `/backend/payments/config`. Check that payments are enabled and `mode` is `test`.
3. Sign in on the new site. Browser sessions and saved bags on `localhost` do not move to another domain; your database accounts remain available.
4. Complete the profile's contact and shipping fields. Save an available NGN product to the bag and review checkout.
5. Select **Pay … in test mode** to save the order and open the demo-payment guide. Copy the public test card details, then choose **Open Paystack checkout**. Paystack opens in another tab so the guide stays available.
6. Choose Card on Paystack, enter `4084 0840 8408 4081`, expiry `12/35`, CVV `408`. Any future expiry works. This successful test card needs no PIN or OTP. Use test data only.
7. Complete the test payment. Paystack should return to the Vercel site. If needed, return to the guide and select **Check payment status**. The backend must verify success before the receipt appears. A successful test order changes demo stock and order records.

The guide also appears when resuming an existing unpaid order, after the backend rechecks the profile. It never collects card inputs. Only Paystack hosts the card form. Clipboard failures leave the details visible and select the requested value for manual copying. The original tab also checks the saved order while open and refreshes after returning to it; a verified terminal status returns the shopper to order details. Polling does not itself declare payment success.

The card details come from [Paystack's test payments documentation](https://paystack.com/docs/payments/test-payments/). We cannot place custom UI inside Paystack's separately hosted page; keeping the guide available in its original tab is the supported alternative used here.

## Preview deployments

The same two variables can be applied to Preview. A preview's exact HTTPS origin must also be trusted on Render for login and writes. Do not add a wildcard for all `vercel.app` sites. The backend has one fixed checkout frontend origin, so payment callbacks still return to the configured production site unless you deliberately change it. Use the stable production URL for the demo payment walkthrough.

## Common fixes

- **Sign-in or writes fail:** check the exact Vercel origin in Render's `BETTER_AUTH_TRUSTED_ORIGINS`, redeploy Render, and sign in again on Vercel.
- **API calls go to localhost:** set `NEXT_PUBLIC_API_URL=/backend` and redeploy Vercel.
- **The API proxy returns 404:** check `API_UPSTREAM_URL` and redeploy Vercel; the rewrite is generated when Next.js builds.
- **Paystack returns to localhost:** update Render's `CHECKOUT_FRONTEND_URL`, redeploy Render, and create a fresh test order.
- **The first API request is slow:** a sleeping Render Free service may need time to wake up.

The frontend source is published to [no-excusesss/forma-frontend](https://github.com/no-excusesss/forma-frontend). Import that repository into Vercel using the settings above. Publishing the repository does not create a Vercel project or change Render's trusted origins; those settings depend on the actual Vercel URL.

## Validation for this update

The frontend production build, TypeScript and ESLint checks pass. An offline `npm ci --include=dev --ignore-scripts --dry-run` accepts the package and lockfile. All 13 unit tests and 28 desktop/mobile checkout browser checks pass, including copying, manual-copy fallback, the separate Paystack tab, profile gating, idempotent order creation, resuming, pending payments, and backend-confirmed receipts. Provider responses are simulated in browser tests; deployment verification still includes a genuine Paystack test-mode checkout on the published frontend.

The public Render health endpoint returned HTTP 200 with `status: "ok"` and `payments: "test-only"`. The payment configuration reported `mode: "test"` and `enabled: true` during this verification.
