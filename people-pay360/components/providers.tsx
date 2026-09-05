"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { AppProvider } from "@/lib/store";
import { ToastProvider } from "@/components/ui/toast";
import { AppShell } from "@/components/layout/app-shell";

export function Providers({ children, session }: { children: React.ReactNode, session: any }) {
  return (
    <SessionProvider session={session}>
      <AppProvider>
        <ToastProvider>
          <AppShell>{children}</AppShell>
        </ToastProvider>
      </AppProvider>
    </SessionProvider>
  );
}
