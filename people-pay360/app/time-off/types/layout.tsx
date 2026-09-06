import { getAuthenticatedUser } from "@/lib/actions/auth-helpers";
import { canAccessModule } from "@/lib/rbac";
import { redirect } from "next/navigation";

export default async function TimeOffTypesLayout({ children }: { children: React.ReactNode }) {
  try {
    const user = await getAuthenticatedUser();
    if (!canAccessModule(user.role, "time_off_types")) {
      redirect("/dashboard");
    }
    return <>{children}</>;
  } catch (err) {
    redirect("/login");
  }
}
