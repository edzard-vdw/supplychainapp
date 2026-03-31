# Changes — Supplier Management + Sidebar Redesign

**Commit:** `2000edc` · **Branch:** `main`

---

## 1. Supplier Management (Settings)

Added full supplier CRUD to the Settings page. Previously only users could be added; now suppliers can be created and managed independently.

**New file:** `src/lib/actions/suppliers.ts`
- `createSupplier` — validates name uniqueness, creates record
- `updateSupplier` — validates against other suppliers, updates record
- `deactivateSupplier` / `reactivateSupplier` — soft delete toggle
- `getSuppliers` — returns all suppliers with user count

**Updated:** `src/app/(protected)/(shell)/settings/page.tsx`
- Fetches all suppliers (active + inactive) including `country`, `contactName`, `contactEmail`, `isActive`, and `_count.users`

**Updated:** `src/app/(protected)/(shell)/settings/settings-client.tsx`
- New `SuppliersSection` component with `AddSupplierForm` (name, type, country, contact name, contact email)
- Each supplier row shows user count, type badge, contact info, and deactivate/reactivate toggle
- `AddUserForm` now warns when no active suppliers exist for the Supplier role
- `SuppliersSection` appears above the Team section

---

## 2. Sidebar Redesign

Replaced the wide `w-[160px]` text-label sidebar in `Shell` with a narrow `w-14` icon-only strip matching the hub dashboard style.

**Updated:** `src/app/(protected)/shell.tsx`

| Before | After |
|--------|-------|
| `w-[160px]` sidebar | `w-14` sidebar (56 px) |
| `[Disc icon] The Loom` text link at top | Double-circle home button (matches hub) |
| Icon + text label per section | Icon only, with `title` tooltip on hover |
| Text "Settings" + "Sign out" links at bottom | Settings icon + user initials avatar (signs out on click) |

- Active section: coloured left-bar accent + section-coloured icon (same visual as before, just no text)
- Mobile header: mini double-circle replaces the Disc icon for the home link
- Mobile slide-out menu unchanged
