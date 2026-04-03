import { redirect } from "next/navigation";

// The orders list is now unified under /overview?view=orders
// Individual order detail pages (/orders/[orderId]) remain as-is
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ upload?: string }>;
}) {
  const { upload } = await searchParams;
  if (upload === "true") {
    redirect("/overview?view=orders&upload=true");
  }
  redirect("/overview?view=orders");
}
