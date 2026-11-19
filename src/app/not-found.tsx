import Link from "next/link";
export default function NotFound() {
  return (
    <div className="container not-found">
      <p className="eyebrow">404 — A wrong turn</p>
      <h1>
        Good things are
        <br />
        still out there.
      </h1>
      <p className="muted">
        We couldn’t find this page. Let’s find something you’ll love.
      </p>
      <Link className="button" href="/products">
        Explore the marketplace ↗
      </Link>
    </div>
  );
}
