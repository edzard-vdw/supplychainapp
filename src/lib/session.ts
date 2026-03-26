import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId: number;
  email: string;
  name: string;
  role: string;
  supplierId: number | null;
  supplierName: string | null;
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
