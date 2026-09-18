import Link from "next/link";
import { Shell } from "@/components/shell";

export default function NotFound() {
  return (
    <Shell>
      <section className="page-introduction">
        <p className="eyebrow">404</p>
        <h1>Page Not Found</h1>
        <p>The page you are looking for does not exist or has been moved.</p>
        <div className="auth-actions" style={{ marginTop: "1.5rem" }}>
          <Link className="primary-button" href="/">
            Back to Home
          </Link>
        </div>
      </section>
    </Shell>
  );
}
