import { Suspense } from "react";
import { AuthForm } from "@/features/auth/auth-form";
import { Loading } from "@/components/ui";
export const metadata = { title: "Create an account" };
export default function SignUp() {
  return (
    <Suspense fallback={<Loading />}>
      <AuthForm signup />
    </Suspense>
  );
}
