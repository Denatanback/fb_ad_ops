import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/sign-in-form";
import { authCopy } from "@/lib/ui-copy";
import { getAuthSession } from "@/server/auth/session";

type SignInPageProps = {
  searchParams?: {
    callbackUrl?: string;
  };
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await getAuthSession();

  if (session?.user) {
    redirect("/");
  }

  const callbackUrl = searchParams?.callbackUrl || "/";

  return (
    <main className="sign-in-page">
      <section className="sign-in-card">
        <p className="eyebrow">{authCopy.signIn.eyebrow}</p>
        <h1>{authCopy.signIn.title}</h1>
        <p>{authCopy.signIn.description}</p>

        <SignInForm callbackUrl={callbackUrl} />

        <p className="auth-footer">{authCopy.signIn.footer}</p>
      </section>
    </main>
  );
}
