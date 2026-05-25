"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Clock3, Loader2, LogIn } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLoginMutation } from "@/lib/features/api/apiSlice";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  getRoleHomePath,
  getStoredToken,
  getStoredUser,
  saveAuthSession,
} from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [login, { isLoading, error }] = useLoginMutation();

  useEffect(() => {
    const token = getStoredToken();
    const user = getStoredUser();

    if (token && user) {
      router.replace(getRoleHomePath(user.role));
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const response = await login({ email, password }).unwrap();
      const user = saveAuthSession(response);
      router.replace(getRoleHomePath(user.role));
    } catch {
      // RTK Query exposes the backend error through the mutation state.
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-6 py-12 sm:px-8">
      <div className="w-full max-w-[400px] flex flex-col">
        {/* ── Branding ── */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_2px_8px_rgba(18,106,99,0.12)]">
            <Clock3 className="h-[22px] w-[22px]" strokeWidth={2} />
          </div>
          <h1 className="mt-6 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Timer Registration System
          </h1>
          <p className="mt-2 text-sm text-slate-500 font-medium">
            Sign in to your account to continue
          </p>
        </div>

        {/* ── Login form card ── */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-8 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_8px_24px_rgba(148,163,184,0.08)]">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2 flex flex-col">
              <Label
                htmlFor="email"
                className="text-[13px] font-medium text-slate-700"
              >
                Email address
              </Label>
              <Input
                autoComplete="email"
                id="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/10 px-3 text-sm placeholder:text-slate-400 focus-visible:border-primary/50 focus-visible:ring-primary/10 transition-colors"
              />
            </div>

            <div className="space-y-2 flex flex-col">
              <Label
                htmlFor="password"
                className="text-[13px] font-medium text-slate-700"
              >
                Password
              </Label>
              <Input
                autoComplete="current-password"
                id="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
                type="password"
                value={password}
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50/10 px-3 text-sm placeholder:text-slate-400 focus-visible:border-primary/50 focus-visible:ring-primary/10 transition-colors"
              />
            </div>

            {error ? (
              <Alert variant="destructive" className="rounded-lg border border-destructive/20 bg-destructive/5 text-destructive text-[13px] py-3 px-4 flex gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <AlertDescription className="font-medium text-destructive leading-normal">{getApiErrorMessage(error)}</AlertDescription>
              </Alert>
            ) : null}

            <Button
              className="h-10 w-full rounded-lg text-sm font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05)] bg-[#126a63] hover:bg-[#0f5650] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2"
              disabled={isLoading}
              type="submit"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {isLoading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        {/* ── Footer ── */}
        <p className="mt-8 text-center text-xs text-slate-400/80 font-normal tracking-wide">
          Sireto Technology &middot; Time Registration System
        </p>
      </div>
    </main>
  );
}
