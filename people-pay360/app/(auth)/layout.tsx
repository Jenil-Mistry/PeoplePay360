import React from "react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Ambient Background Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/8 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Branding Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 font-medium group"
          >
            <div className="size-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-black text-lg shadow-md group-hover:scale-105 transition-transform">
              P
            </div>
            <span className="font-bold text-xl tracking-tight text-foreground">
              PeoplePay<span className="text-primary font-black">360</span>
            </span>
          </Link>
          <p className="text-xs text-muted-foreground mt-2">
            Integrated HR & Payroll Operations
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}
