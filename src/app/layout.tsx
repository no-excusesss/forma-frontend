import type { Metadata } from "next";
import { AppProvider } from "@/providers/app-provider";
import { Header, Footer } from "@/components/layout";
import { GlobalActivity } from "@/components/loading";
import "./globals.css";
import "./experience.css";
import "./checkout.css";
import "./refinement.css";
import "./marketplace-home.css";
import "./browse.css";
import "./demo-payment.css";
import "./bag.css";
export const metadata: Metadata = {
  title: {
    default: "Forma — Good things. Independent minds.",
    template: "%s · Forma",
  },
  description:
    "A marketplace for everyday discoveries. Explore products from independent sellers, find your favourites, and make room for something good.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <GlobalActivity />
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </AppProvider>
      </body>
    </html>
  );
}
