"use client";

import { useState, useTransition } from "react";
import { RefreshCw, CheckCircle, AlertTriangle, UserPlus, KeyRound, EyeOff, Eye, X, Copy, Check } from "lucide-react";
import { createUser, deactivateUser, reactivateUser, resetUserPassword } from "@/lib/actions/users";

// ─── Types ───────────────────────────────────────────────────────────────────

type SupplierInfo = { id: number; name: string; type: string };

type UserRow = {
  id: number;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  supplierId: number | null;
  supplier: SupplierInfo | null;
  createdAt: string;
};

interface SettingsClientProps {
  isAdmin: boolean;
  currentUserId: number;
  users: UserRow[];
  suppliers: SupplierInfo[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "bg-badge-orange-bg text-badge-orange-text",
  SUPPLIER: "bg-badge-blue-bg text-badge-blue-text",
  VIEWER: "bg-badge-yellow-bg text-badge-yellow-text",
};

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${ROLE_BADGE[role] ?? "bg-secondary text-foreground"}`}>
      {role}
    </span>
  );
}

// ─── Add User Form ────────────────────────────────────────────────────────────

interface AddUserFormProps {
  defaultRole: "ADMIN" | "SUPPLIER";
  defaultSupplierId?: number;
  suppliers: SupplierInfo[];
  onSuccess: (result: { user: UserRow; tempPassword: string }) => void;
  onCancel: () => void;
}

function AddUserForm({ defaultRole, defaultSupplierId, suppliers, onSuccess, onCancel }: AddUserFormProps) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "SUPPLIER" | "VIEWER">(defaultRole);
  const [supplierId, setSupplierId] = useState<number | null>(defaultSupplierId ?? null);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createUser({
        name: name.trim(),
        email: email.trim(),
        role,
        supplierId: role === "SUPPLIER" ? supplierId : null,
      });
      if (result.success && result.data) {
        onSuccess(result.data as unknown as { user: UserRow; tempPassword: string });
      } else {
        setError(result.error ?? "Failed to create user");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-4 rounded-xl border border-border bg-background space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Full Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Smith"
            required
            className="w-full px-3 py-2 bg-card border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="block text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            required
            className="w-full px-3 py-2 bg-card border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "ADMIN" | "SUPPLIER" | "VIEWER")}
            className="w-full px-3 py-2 bg-card border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="ADMIN">Admin</option>
            <option value="SUPPLIER">Supplier</option>
            <option value="VIEWER">Viewer</option>
          </select>
        </div>
        {role === "SUPPLIER" && (
          <div>
            <label className="block text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Supplier</label>
            <select
              value={supplierId ?? ""}
              onChange={(e) => setSupplierId(e.target.value ? parseInt(e.target.value) : null)}
              required
              className="w-full px-3 py-2 bg-card border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Select supplier…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-badge-red-text flex items-center gap-1.5">
          <AlertTriangle size={13} />
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 rounded-lg bg-foreground text-background text-[11px] font-semibold uppercase tracking-wider hover:bg-foreground/90 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Creating…" : "Create Account"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Temp Password Banner ─────────────────────────────────────────────────────

function TempPasswordBanner({ name, tempPassword, onDismiss }: { name: string; tempPassword: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-4 p-4 rounded-xl border border-badge-green-text/30 bg-badge-green-bg/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold text-foreground mb-1">
            ✓ Account created for {name}
          </p>
          <p className="text-[10px] text-muted-foreground mb-3">
            Share this temporary password securely — it will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border font-mono-brand text-[13px] font-semibold tracking-wider text-foreground">
              {visible ? tempPassword : "••••••••••••"}
            </div>
            <button
              onClick={() => setVisible(!visible)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              title={visible ? "Hide" : "Show password"}
            >
              {visible ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90 transition-colors"
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── User Row ─────────────────────────────────────────────────────────────────

interface UserRowComponentProps {
  user: UserRow;
  currentUserId: number;
  onPasswordReset: (userId: number, userName: string, tempPassword: string) => void;
}

function UserRowComponent({ user, currentUserId, onPasswordReset }: UserRowComponentProps) {
  const [isPending, startTransition] = useTransition();
  const isSelf = user.id === currentUserId;

  function handleDeactivate() {
    startTransition(async () => {
      await deactivateUser(user.id, currentUserId);
    });
  }

  function handleReactivate() {
    startTransition(async () => {
      await reactivateUser(user.id);
    });
  }

  function handleResetPassword() {
    startTransition(async () => {
      const result = await resetUserPassword(user.id);
      if (result.success && result.data) {
        onPasswordReset(user.id, user.name, result.data.tempPassword);
      }
    });
  }

  return (
    <div className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors ${!user.isActive ? "opacity-50" : "hover:bg-secondary/30"}`}>
      {/* Avatar initial */}
      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
        <span className="text-[11px] font-bold text-foreground uppercase">{user.name.charAt(0)}</span>
      </div>

      {/* Name + email */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] font-semibold text-foreground truncate">{user.name}</span>
          {isSelf && <span className="text-[9px] font-bold uppercase tracking-wider text-badge-blue-text bg-badge-blue-bg px-1.5 py-0.5 rounded">You</span>}
          {!user.isActive && <span className="text-[9px] font-bold uppercase tracking-wider text-badge-red-text bg-badge-red-bg px-1.5 py-0.5 rounded">Deactivated</span>}
        </div>
        <p className="text-[10px] text-muted-foreground font-mono-brand truncate">{user.email}</p>
      </div>

      <RoleBadge role={user.role} />

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={handleResetPassword}
          disabled={isPending || !user.isActive}
          title="Reset password"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <KeyRound size={13} />
        </button>

        {!isSelf && (
          user.isActive ? (
            <button
              onClick={handleDeactivate}
              disabled={isPending}
              title="Deactivate account"
              className="px-2 py-1 rounded-lg text-muted-foreground hover:text-badge-red-text hover:bg-badge-red-bg/30 disabled:opacity-30 transition-colors text-[10px] font-semibold uppercase tracking-wider"
            >
              Deactivate
            </button>
          ) : (
            <button
              onClick={handleReactivate}
              disabled={isPending}
              title="Reactivate account"
              className="px-2 py-1 rounded-lg text-muted-foreground hover:text-badge-green-text hover:bg-badge-green-bg/30 disabled:opacity-30 transition-colors text-[10px] font-semibold uppercase tracking-wider"
            >
              Reactivate
            </button>
          )
        )}
      </div>
    </div>
  );
}

// ─── Team Section ─────────────────────────────────────────────────────────────

function TeamSection({ users, suppliers, currentUserId }: { users: UserRow[]; suppliers: SupplierInfo[]; currentUserId: number }) {
  const [addForm, setAddForm] = useState<{ role: "ADMIN" | "SUPPLIER"; supplierId?: number } | null>(null);
  const [tempPasswordBanner, setTempPasswordBanner] = useState<{ name: string; tempPassword: string } | null>(null);
  const [resetBanners, setResetBanners] = useState<Record<number, { name: string; tempPassword: string }>>({});

  // Group users
  const adminUsers = users.filter((u) => u.role === "ADMIN");
  const supplierGroups = suppliers.map((s) => ({
    supplier: s,
    users: users.filter((u) => u.supplierId === s.id),
  }));
  const unassignedSupplierUsers = users.filter(
    (u) => u.role === "SUPPLIER" && !u.supplierId
  );

  function handleAddSuccess(data: { user: UserRow; tempPassword: string }) {
    setAddForm(null);
    setTempPasswordBanner({ name: data.user.name, tempPassword: data.tempPassword });
  }

  function handleResetDone(userId: number, userName: string, tempPassword: string) {
    setResetBanners((prev) => ({ ...prev, [userId]: { name: userName, tempPassword } }));
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[12px] font-bold uppercase tracking-wider text-foreground">Team</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Manage user accounts. Supplier users can only access their supplier&apos;s data.
          </p>
        </div>
        <button
          onClick={() => setAddForm({ role: "SUPPLIER" })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background text-[11px] font-semibold uppercase tracking-wider hover:bg-foreground/90 transition-colors"
        >
          <UserPlus size={13} />
          Add User
        </button>
      </div>

      {/* Global creation banner */}
      {tempPasswordBanner && (
        <TempPasswordBanner
          name={tempPasswordBanner.name}
          tempPassword={tempPasswordBanner.tempPassword}
          onDismiss={() => setTempPasswordBanner(null)}
        />
      )}

      {/* Global add form (when triggered from header — no pre-selected supplier) */}
      {addForm && addForm.supplierId === undefined && (
        <AddUserForm
          defaultRole={addForm.role}
          suppliers={suppliers}
          onSuccess={handleAddSuccess}
          onCancel={() => setAddForm(null)}
        />
      )}

      <div className="mt-5 space-y-6">
        {/* ── Admins ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground">
              Admins ({adminUsers.length})
            </p>
            <button
              onClick={() => setAddForm({ role: "ADMIN" })}
              className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            >
              <UserPlus size={11} />
              Add Admin
            </button>
          </div>
          <div className="rounded-xl border border-border overflow-hidden">
            {adminUsers.length === 0 ? (
              <p className="text-[11px] text-muted-foreground px-3 py-3">No admin users.</p>
            ) : (
              adminUsers.map((user) => (
                <div key={user.id}>
                  <UserRowComponent
                    user={user}
                    currentUserId={currentUserId}
                    onPasswordReset={handleResetDone}
                  />
                  {resetBanners[user.id] && (
                    <div className="px-3 pb-2">
                      <TempPasswordBanner
                        name={resetBanners[user.id].name}
                        tempPassword={resetBanners[user.id].tempPassword}
                        onDismiss={() =>
                          setResetBanners((prev) => {
                            const n = { ...prev };
                            delete n[user.id];
                            return n;
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Per-supplier groups ── */}
        {supplierGroups.map(({ supplier, users: groupUsers }) => (
          <div key={supplier.id}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground">
                  {supplier.name}
                </p>
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 bg-secondary px-1.5 py-0.5 rounded">
                  {supplier.type}
                </span>
                <span className="text-[10px] text-muted-foreground/60">({groupUsers.length})</span>
              </div>
              <button
                onClick={() => setAddForm({ role: "SUPPLIER", supplierId: supplier.id })}
                className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                <UserPlus size={11} />
                Add User
              </button>
            </div>

            {/* Inline add form for this supplier */}
            {addForm?.supplierId === supplier.id && (
              <AddUserForm
                defaultRole="SUPPLIER"
                defaultSupplierId={supplier.id}
                suppliers={suppliers}
                onSuccess={handleAddSuccess}
                onCancel={() => setAddForm(null)}
              />
            )}

            <div className="rounded-xl border border-border overflow-hidden">
              {groupUsers.length === 0 ? (
                <p className="text-[11px] text-muted-foreground px-3 py-3">
                  No users yet — add one to give {supplier.name} access.
                </p>
              ) : (
                groupUsers.map((user) => (
                  <div key={user.id}>
                    <UserRowComponent
                      user={user}
                      currentUserId={currentUserId}
                      onPasswordReset={handleResetDone}
                    />
                    {resetBanners[user.id] && (
                      <div className="px-3 pb-2">
                        <TempPasswordBanner
                          name={resetBanners[user.id].name}
                          tempPassword={resetBanners[user.id].tempPassword}
                          onDismiss={() =>
                            setResetBanners((prev) => {
                              const n = { ...prev };
                              delete n[user.id];
                              return n;
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ))}

        {/* ── Unassigned supplier users (shouldn't normally happen, but handle it) ── */}
        {unassignedSupplierUsers.length > 0 && (
          <div>
            <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-2">
              Unassigned ({unassignedSupplierUsers.length})
            </p>
            <div className="rounded-xl border border-border overflow-hidden">
              {unassignedSupplierUsers.map((user) => (
                <UserRowComponent
                  key={user.id}
                  user={user}
                  currentUserId={currentUserId}
                  onPasswordReset={handleResetDone}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Settings Component ──────────────────────────────────────────────────

export function SettingsClient({ isAdmin, currentUserId, users, suppliers }: SettingsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [baseUrl, setBaseUrl] = useState("https://api.sheepinc.com/api/production");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [syncResult, setSyncResult] = useState<{ success: boolean; message: string } | null>(null);
  const [configResult, setConfigResult] = useState<{ success: boolean; message: string } | null>(null);

  async function handleSaveConfig() {
    startTransition(async () => {
      try {
        const { saveApiConfig, testConnection } = await import("@/lib/sync/sheep-api-client");
        await saveApiConfig({ baseUrl, email, password });
        const test = await testConnection();
        setConfigResult({
          success: test.success,
          message: test.success ? "Connected successfully" : test.error || "Connection failed",
        });
      } catch {
        setConfigResult({ success: false, message: "Failed to save config" });
      }
    });
  }

  async function handleFullSync() {
    setSyncResult(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/sync/pull", { method: "POST" });
        const data = await res.json();
        setSyncResult({
          success: data.success,
          message: data.success
            ? `Synced ${data.data?.totalPulled || 0} records`
            : data.error || "Sync failed",
        });
      } catch {
        setSyncResult({ success: false, message: "Sync request failed" });
      }
    });
  }

  return (
    <div className="px-6 py-8 max-w-[900px] mx-auto">
      <div className="mb-8">
        <p className="text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Configuration</p>
        <h1 className="text-[20px] font-bold uppercase tracking-wide text-foreground">Settings</h1>
      </div>

      <div className="space-y-6">
        {/* ── Team (admin only) ── */}
        {isAdmin && (
          <TeamSection
            users={users}
            suppliers={suppliers}
            currentUserId={currentUserId}
          />
        )}

        {/* ── API Config (admin only) ── */}
        {isAdmin && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-foreground mb-4">Legacy API Connection</h3>
            <p className="text-[11px] text-muted-foreground mb-4">
              Connect to api.sheepinc.com to sync orders, materials, production runs, and garments.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">API Base URL</label>
                <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[12px] font-mono-brand text-foreground outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <div>
                <label className="block text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="your@email.com" />
              </div>
              <div>
                <label className="block text-[10px] font-mono-brand uppercase tracking-widest text-muted-foreground mb-1">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[12px] text-foreground outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <button onClick={handleSaveConfig} disabled={isPending} className="px-4 py-2 rounded-lg bg-foreground text-background text-[11px] font-semibold uppercase tracking-wider hover:bg-foreground/90 disabled:opacity-50 transition-colors">
                {isPending ? "Saving..." : "Save & Test"}
              </button>
              {configResult && (
                <div className={`flex items-center gap-1.5 text-[11px] ${configResult.success ? "text-badge-green-text" : "text-badge-red-text"}`}>
                  {configResult.success ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                  {configResult.message}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Data Sync (admin only) ── */}
        {isAdmin && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-foreground mb-4">Data Sync</h3>
            <p className="text-[11px] text-muted-foreground mb-4">
              Pull all data from the legacy API: colours, orders, production runs, and garments. This is incremental — existing records will be updated.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleFullSync}
                disabled={isPending}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-background text-[11px] font-semibold uppercase tracking-wider hover:bg-foreground/90 disabled:opacity-50 transition-colors"
              >
                <RefreshCw size={14} className={isPending ? "animate-spin" : ""} />
                {isPending ? "Syncing..." : "Run Full Sync"}
              </button>
              {syncResult && (
                <div className={`flex items-center gap-1.5 text-[11px] ${syncResult.success ? "text-badge-green-text" : "text-badge-red-text"}`}>
                  {syncResult.success ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                  {syncResult.message}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Shopify (admin only) ── */}
        {isAdmin && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-foreground mb-4">Shopify Integration</h3>
            <p className="text-[11px] text-muted-foreground">Coming soon — configure Shopify Admin API for inventory sync.</p>
          </div>
        )}

        {/* ── Non-admin view ── */}
        {!isAdmin && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-[12px] font-bold uppercase tracking-wider text-foreground mb-2">Account</h3>
            <p className="text-[11px] text-muted-foreground">Account settings are managed by your administrator.</p>
          </div>
        )}
      </div>
    </div>
  );
}
