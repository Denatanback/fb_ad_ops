"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { authCopy } from "@/lib/ui-copy";

type SignInFormProps = {
  callbackUrl: string;
};

export function SignInForm({ callbackUrl }: SignInFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    startTransition(async () => {
      setError(null);

      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl,
        redirect: false
      });

      if (!result || result.error) {
        setError(authCopy.signIn.error);
        return;
      }

      const rawUrl = result.url ?? callbackUrl;
      const targetUrl = rawUrl.startsWith("http")
        ? (() => {
            try {
              const u = new URL(rawUrl);
              return u.pathname + u.search;
            } catch {
              return callbackUrl;
            }
          })()
        : rawUrl;

      router.push(targetUrl);
      router.refresh();
    });
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <label className="auth-field">
        <span>{authCopy.signIn.emailLabel}</span>
        <input
          autoComplete="email"
          className="auth-input"
          defaultValue=""
          name="email"
          placeholder={authCopy.signIn.emailPlaceholder}
          required
          type="email"
        />
      </label>

      <label className="auth-field">
        <span>{authCopy.signIn.passwordLabel}</span>
        <input
          autoComplete="current-password"
          className="auth-input"
          defaultValue=""
          name="password"
          placeholder={authCopy.signIn.passwordPlaceholder}
          required
          type="password"
        />
      </label>

      {error ? <p className="auth-error">{error}</p> : null}

      <button className="button button--primary auth-submit" disabled={isPending} type="submit">
        {isPending ? authCopy.signIn.submitPending : authCopy.signIn.submitIdle}
      </button>
    </form>
  );
}
