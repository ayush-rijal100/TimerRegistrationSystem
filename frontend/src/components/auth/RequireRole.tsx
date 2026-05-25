"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getRoleHomePath, getStoredToken, getStoredUser } from "@/lib/auth";
import type { AuthUser, UserRole } from "@/lib/types";

type RequireRoleProps = {
  allowedRoles: UserRole[];
  children: (user: AuthUser) => React.ReactNode;
};

export function RequireRole({ allowedRoles, children }: RequireRoleProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    const storedUser = getStoredUser();

    if (!token || !storedUser) {
      router.replace("/login");
      return;
    }

    if (!allowedRoles.includes(storedUser.role)) {
      router.replace(getRoleHomePath(storedUser.role));
      return;
    }

    window.requestAnimationFrame(() => {
      setUser(storedUser);
    });
  }, [allowedRoles, router]);

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Checking access...
        </div>
      </main>
    );
  }

  return children(user);
}
