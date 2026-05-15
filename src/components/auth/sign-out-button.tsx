"use client";

import { signOut } from "next-auth/react";
import { useTransition } from "react";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      await signOut({
        callbackUrl: "/sign-in"
      });
    });
  }

  return (
    <button className="button button--secondary button--compact" onClick={handleSignOut} type="button">
      {isPending ? "Выходим..." : "Выйти"}
    </button>
  );
}
