"use server";

import { prisma } from "@/lib/db";

const DEFAULT_BASE_URL = "https://api.sheepinc.com/api/production";

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

async function getApiConfig() {
  const [baseUrlSetting, emailSetting, passwordSetting, tokenSetting] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: "sync_api_base_url" } }),
    prisma.appSetting.findUnique({ where: { key: "sync_api_email" } }),
    prisma.appSetting.findUnique({ where: { key: "sync_api_password" } }),
    prisma.appSetting.findUnique({ where: { key: "sync_api_token" } }),
  ]);

  return {
    baseUrl: baseUrlSetting?.value || DEFAULT_BASE_URL,
    email: emailSetting?.value || "",
    password: passwordSetting?.value || "",
    token: tokenSetting?.value || "",
  };
}

async function storeToken(token: string) {
  await prisma.appSetting.upsert({
    where: { key: "sync_api_token" },
    update: { value: token },
    create: { key: "sync_api_token", value: token },
  });
}

async function authenticate(): Promise<string | null> {
  const config = await getApiConfig();
  if (!config.email || !config.password) return null;

  try {
    const res = await fetch(`${config.baseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: config.email, password: config.password }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const token = data?.access_token || data?.token;
    if (token) {
      await storeToken(token);
      return token;
    }
    return null;
  } catch {
    return null;
  }
}

async function getToken(): Promise<string | null> {
  const config = await getApiConfig();
  if (config.token) return config.token;
  return authenticate();
}

export async function apiGet<T = unknown>(path: string): Promise<ApiResponse<T>> {
  const config = await getApiConfig();
  const token = await getToken();
  if (!token) return { success: false, error: "Not authenticated with legacy API" };

  try {
    const res = await fetch(`${config.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });

    if (res.status === 401) {
      // Token expired, re-authenticate
      const newToken = await authenticate();
      if (!newToken) return { success: false, error: "Authentication failed" };

      const retryRes = await fetch(`${config.baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${newToken}`, "Content-Type": "application/json" },
      });

      if (!retryRes.ok) return { success: false, error: `API error: ${retryRes.status}` };
      const data = await retryRes.json();
      return { success: true, data };
    }

    if (!res.ok) return { success: false, error: `API error: ${res.status}` };
    const data = await res.json();
    return { success: true, data };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "API request failed" };
  }
}

export async function apiPost<T = unknown>(path: string, body: unknown): Promise<ApiResponse<T>> {
  const config = await getApiConfig();
  const token = await getToken();
  if (!token) return { success: false, error: "Not authenticated with legacy API" };

  try {
    const res = await fetch(`${config.baseUrl}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) return { success: false, error: `API error: ${res.status}` };
    const data = await res.json();
    return { success: true, data };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "API request failed" };
  }
}

export async function testConnection(): Promise<ApiResponse> {
  const token = await authenticate();
  if (!token) return { success: false, error: "Could not authenticate. Check email and password." };
  return { success: true, data: { message: "Connected successfully" } };
}

export async function saveApiConfig(config: { baseUrl?: string; email?: string; password?: string }) {
  try {
    const operations = [];
    if (config.baseUrl) {
      operations.push(
        prisma.appSetting.upsert({
          where: { key: "sync_api_base_url" },
          update: { value: config.baseUrl },
          create: { key: "sync_api_base_url", value: config.baseUrl },
        })
      );
    }
    if (config.email) {
      operations.push(
        prisma.appSetting.upsert({
          where: { key: "sync_api_email" },
          update: { value: config.email },
          create: { key: "sync_api_email", value: config.email },
        })
      );
    }
    if (config.password) {
      operations.push(
        prisma.appSetting.upsert({
          where: { key: "sync_api_password" },
          update: { value: config.password },
          create: { key: "sync_api_password", value: config.password },
        })
      );
    }
    await prisma.$transaction(operations);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to save config" };
  }
}
