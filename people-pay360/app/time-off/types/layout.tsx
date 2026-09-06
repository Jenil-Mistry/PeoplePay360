import { getAuthenticatedUser } from "@/lib/actions/auth-helpers";
import { canAccessModule } from "@/lib/rbac";
import { redirect } from "next/navigation";

export default async function TimeOffTypesLayout({ children }: { children: React.ReactNode }) {
  // Avoid constructing JSX inside try/catch for Next.js Layouts
  let hasError = false;
  try {
    const user = await getAuthenticatedUser();
    if (!canAccessModule(user.role, "time_off_types")) {
      hasError = true;
    }
  } catch (e) {
    hasError = true;
  }

  if (hasError) {
    redirect("/dashboard");
  }
  
  return <>{children}</>;
}
