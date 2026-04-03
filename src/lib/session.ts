import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export interface SessionData {
  userId: number;
  email: string;
  name: string;
  role: string;
  supplierId: number | null;
  supplierName: string | null;
  language: string;
  isLoggedIn: boolean;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "sheep-supply-chain-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production" && !process.env.DISABLE_SECURE_COOKIE,
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 8, // 8 hours
  },
};

export const defaultSession: SessionData = {
  userId: 0,
  email: "",
  name: "",
  role: "",
  supplierId: null,
  supplierName: null,
  language: "en",
  isLoggedIn: false,
};

export async function getSession() {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(
    cookieStore,
    sessionOptions
  );

  if (!session.isLoggedIn) {
    session.userId = defaultSession.userId;
    session.email = defaultSession.email;
    session.name = defaultSession.name;
    session.role = defaultSession.role;
    session.supplierId = defaultSession.supplierId;
    session.supplierName = defaultSession.supplierName;
    session.isLoggedIn = defaultSession.isLoggedIn;
  }

  // Always read language fresh from DB so a language change is reflected
  // immediately on the next page render — no cookie sync required.
  if (session.isLoggedIn && session.userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { language: true },
      });
      session.language = user?.language ?? defaultSession.language;
    } catch {
      // DB unavailable — fall back to whatever is in the session cookie
      if (!session.language) session.language = defaultSession.language;
    }
  } else if (!session.language) {
    session.language = defaultSession.language;
  }

  return session;
}

// Helper to check if user is admin
export function isAdmin(session: SessionData): boolean {
  return session.role === "ADMIN";
}

// Helper to get supplier filter for queries
export function getSupplierFilter(session: SessionData): { supplierId: number } | undefined {
  if (session.role === "ADMIN") return undefined; // Admin sees all
  if (session.supplierId) return { supplierId: session.supplierId };
  return { supplierId: -1 }; // No supplier = see nothing
}
