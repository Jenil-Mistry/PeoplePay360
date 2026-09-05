import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { employees } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "peoplepay360_auth_secret_key_jwt_session_2026_production_safe_token",
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const [employee] = await db
          .select()
          .from(employees)
          .where(eq(employees.email, email))
          .limit(1);

        if (!employee || !employee.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(password, employee.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: employee.empId,
          name: employee.name,
          email: employee.email,
          role: employee.role,
          empId: employee.empId,
          employeeDbId: employee.id,
          jobPosition: employee.jobPosition,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as unknown as Record<string, unknown>).role as string;
        token.empId = (user as unknown as Record<string, unknown>).empId as string;
        token.employeeDbId = (user as unknown as Record<string, unknown>).employeeDbId as number;
        token.jobPosition = (user as unknown as Record<string, unknown>).jobPosition as string;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as unknown as Record<string, unknown>).role = token.role;
        (session.user as unknown as Record<string, unknown>).empId = token.empId;
        (session.user as unknown as Record<string, unknown>).employeeDbId = token.employeeDbId;
        (session.user as unknown as Record<string, unknown>).jobPosition = token.jobPosition;
        session.user.id = token.sub!;
      }
      return session;
    },
  },
});
