import { Suspense } from "react";
import { AuthForm } from "@/features/auth/auth-form";
import { Loading } from "@/components/ui";
export const metadata = { title: "Sign in" };
export default function SignIn() {
  return (
    <Suspense fallback={<Loading />}>
      <AuthForm />
    </Suspense>
  );
}
