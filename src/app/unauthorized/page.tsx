import Link from "next/link";
import { authCopy } from "@/lib/ui-copy";

export default function UnauthorizedPage() {
  return (
    <main className="sign-in-page">
      <section className="sign-in-card">
        <p className="eyebrow">{authCopy.unauthorized.eyebrow}</p>
        <h1>{authCopy.unauthorized.title}</h1>
        <p>{authCopy.unauthorized.description}</p>
        <div className="hero-actions">
          <Link className="button button--primary" href="/">
            {authCopy.unauthorized.backToWorkspace}
          </Link>
          <Link className="button button--secondary" href="/sign-in">
            {authCopy.unauthorized.backToSignIn}
          </Link>
        </div>
      </section>
    </main>
  );
}
