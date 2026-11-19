"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { api, optional } from "@/lib/api";
import { signInSchema, signUpSchema } from "@/lib/validation";
import { DataForm, type FieldSpec } from "@/components/forms";
import { PageIntro } from "@/components/ui";
import type { OwnProfile, SessionResponse } from "@/lib/contracts";
export function AuthForm({ signup = false }: { signup?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const client = useQueryClient();
  const fields: FieldSpec[] = [
    ...(signup
      ? [
          {
            name: "name",
            label: "Your name",
            required: true,
            autoComplete: "name",
          },
        ]
      : []),
    {
      name: "email",
      label: "Email address",
      type: "email",
      required: true,
      autoComplete: "email",
      placeholder: "you@example.com",
    },
    {
      name: "password",
      label: "Password",
      type: "password",
      required: true,
      autoComplete: signup ? "new-password" : "current-password",
      help: signup
        ? "8–128 characters. Make it something only you know."
        : undefined,
    },
    ...(!signup
      ? [{ name: "rememberMe", label: "Keep me signed in", type: "checkbox" }]
      : []),
  ];
  return (
    <div className="auth-page">
      <div className="auth-visual">
        <img
          src="/images/quiet-interior.jpg"
          alt="A calm and considered interior"
        />
        <div className="auth-visual-copy">
          <h2>
            A little space.
            <br />A lot of possibility.
          </h2>
          <p>GOOD THINGS. INDEPENDENT MINDS.</p>
        </div>
      </div>
      <div className="auth-form">
        <PageIntro
          eyebrow="MAKE YOURSELF AT HOME"
          title={signup ? "Your kind of place." : "Good to see you."}
          description={
            signup
              ? "Create an account. Find your favourites. Share your perspective."
              : "Sign in for your next discovery."
          }
        />
        <DataForm
          protectChanges={false}
          fields={fields}
          schema={signup ? signUpSchema : signInSchema}
          initial={{ rememberMe: true }}
          submit={signup ? "Create account →" : "Sign in →"}
          onSave={async (values) => {
            await api(`/api/auth/${signup ? "sign-up" : "sign-in"}/email`, {
              method: "POST",
              body: values,
            });
            await client.cancelQueries();
            client.removeQueries({
              predicate: (query) => query.queryKey[0] !== "session",
            });
            client.getMutationCache().clear();
            const session = await api<SessionResponse>("/api/auth/get-session");
            client.setQueryData(["session"], session);
            if (!session)
              throw new Error(
                "Your session cookie wasn’t retained. Check the API trusted origins and cookie settings, then sign in again.",
              );
            const next = params.get("next");
            let destination = "/account/profile";
            if (!signup) {
              try {
                const profile = await client.fetchQuery({
                  queryKey: ["private", session.user.id, "profile"],
                  queryFn: ({ signal }) =>
                    optional<OwnProfile>("/users/me/profile", signal),
                });
                if (profile) destination = "/";
              } catch {
                /* The profile page displays the actual retrieval error. */
              }
            }
            router.replace(
              next &&
                next.startsWith("/") &&
                !next.startsWith("//") &&
                !next.includes("\\")
                ? next
                : destination,
            );
            return signup ? "Account created." : "You’re signed in.";
          }}
        />
        <p className="auth-switch">
          {signup ? "Already found your place?" : "New around here?"}
          <Link href={signup ? "/sign-in" : "/sign-up"}>
            {signup ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </div>
    </div>
  );
}
