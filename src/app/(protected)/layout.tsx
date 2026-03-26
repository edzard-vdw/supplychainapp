import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ChatWidget } from "@/components/chat/chat-widget";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session.isLoggedIn) {
    redirect("/login");
  }

  return (
    <>
      {children}
      <ChatWidget />
    </>
  );
}
