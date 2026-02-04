import { redirect } from "next/navigation";
import { verifyAdmin } from "@/actions/admin";
import config from "@/config";

/**
 * Admin Layout Guard
 * Ensures only admin users can access admin routes.
 */
export default async function AdminLayout({ children }) {
  const { isAdmin, user } = await verifyAdmin();

  if (!user) {
    redirect(config.routes.login);
  }

  if (!isAdmin) {
    redirect(config.routes.home);
  }

  return <>{children}</>;
}
