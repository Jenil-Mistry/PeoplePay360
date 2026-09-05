import { auth } from "@/lib/auth";
import { canAccessModule, getPermissionLevel, type RbacModule, type UserRole } from "@/lib/rbac";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.employeeDbId || !session.user.role) {
    throw new Error("Unauthorized");
  }

  return session;
}

export async function requireModuleAccess(module: RbacModule, write = false) {
  const session = await requireAuth();
  const role = session.user.role as UserRole;
  const allowed = write
    ? getPermissionLevel(role, module) === "WRITE"
    : canAccessModule(role, module);

  if (!allowed) {
    throw new Error("Forbidden: Insufficient permissions");
  }

  return session;
}

export async function requireAnyRole(roles: UserRole[]) {
  const session = await requireAuth();
  if (!roles.includes(session.user.role as UserRole)) {
    throw new Error("Forbidden: Insufficient permissions");
  }
  return session;
}

