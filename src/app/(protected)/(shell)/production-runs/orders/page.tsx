import { redirect } from "next/navigation";

// This old supplier orders tab has been replaced by the unified Jobs view.
export default function SupplierOrdersTab() {
  redirect("/production-runs");
}
