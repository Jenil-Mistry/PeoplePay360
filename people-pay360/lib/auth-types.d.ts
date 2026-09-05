import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      role: string;
      empId: string;
      employeeDbId: number;
      jobPosition: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    empId: string;
    employeeDbId: number;
    jobPosition: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    empId: string;
    employeeDbId: number;
  }
}
