"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getRoleHomePath, getStoredToken, getStoredUser } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getStoredToken();
    const user = getStoredUser();

    if (token && user) {
      router.replace(getRoleHomePath(user.role));
      return;
    }

    router.replace("/login");
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Opening Time Registration System...
      </div>
    </main>
  );
}
