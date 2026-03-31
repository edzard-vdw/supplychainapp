# The Loom — App Overview

**The Loom** is Sheep Inc.'s internal supply chain management platform. It connects the Sheep Inc. team (admins) with their network of production suppliers (factories), providing end-to-end visibility from order creation through to garment traceability and environmental impact reporting.

---

## Who Uses It

| Role | Who | Access |
|------|-----|--------|
| **Admin** | Sheep Inc. team | Full platform — orders, overview, garments, impact, settings |
| **Supplier** | Factory / mill staff | Supplier portal — their own production runs, orders, materials, garments, impact |

User accounts are managed by admins in Settings. Supplier users are linked to a specific supplier and can only see their own data.

---

## Modules

### For Admins

**Overview**
A cross-supplier dashboard showing all active production runs, a breakdown by supplier, and current stock levels. Three views: All Runs, By Supplier, Stock.

**Orders**
Manage purchase orders sent to suppliers. Orders can be created manually or uploaded via PO document. Each order contains line items (product, colour, size, quantity) and tracks status from Draft through to Delivered. Suppliers see new orders and must acknowledge them before production begins.

**Garments**
Full garment-level traceability. Admins can look up any garment by code or NFC/QR tag, see its full production history, scan statistics, and location data. Includes a Scanning view and a Statistics overview.

**Impact**
Environmental data for the whole supplier network. Tracks GHG emissions, water use, energy, and waste — both at the facility level (annual data submitted by suppliers) and per production run. Admins see an aggregated overview and a per-supplier breakdown.

**Settings**
Admin-only configuration:
- Supplier management — add suppliers, manage contact info, deactivate/reactivate
- Team management — invite users, assign roles, link to suppliers
- App settings and sync configuration

---

### For Suppliers

**Production (My Runs)**
The supplier's view of their own production runs. They can create new runs against their assigned orders, update run status (Planned → In Production → QC → Ready to Ship → Shipped), and log manufacturing details (washing programme, machine gauge, yarn lots, finisher info, size breakdown).

**Materials (Yarn Stock)**
Tracks yarn deliveries received at the factory. Delivery notes can be uploaded and parsed; each delivery is broken down by yarn type, colour code, lot number, and weight. Remaining stock is tracked per lot as it is consumed by production runs.

**Garments**
Suppliers can scan garments during production using NFC or QR codes. Supports both bulk-run tagging (one tag for the whole run) and individual garment tagging. Each scan is logged with device info and GPS coordinates.

**Impact (My Factory)**
Suppliers submit their own environmental data — energy source, water use, waste management, certifications (GOTS, Oeko-Tex, RWS, etc.) — via a facility profile. This feeds into the admin-side Impact reporting.

---

## Key Concepts

**Supplier types** — Grower, Scourer, Spinner, Knitter, Finisher, Retailer, Other. Reflects the wool supply chain stages Sheep Inc. works across.

**Production run lifecycle** — An order line generates one or more production runs. Each run tracks quantity ordered vs. units produced, yarn composition, size breakdown, and tagging progress.

**Garment traceability** — Every garment gets a unique code and can be linked to an NFC tag and/or QR code. Scan events are logged with location, enabling a full chain-of-custody trail from factory to consumer (via a public traceability URL).

**Impact data quality** — Environmental data is flagged as Measured, Estimated, or Benchmarked, and goes through a Draft → Submitted → Approved workflow so Sheep Inc. can review before publishing.

**Shopify sync** — Product and inventory data can be synced from Shopify, linking SKUs to orders and production runs.

---

## Tech Stack

- **Next.js 15** (App Router) — TypeScript throughout
- **Tailwind CSS v4** — dark/light themes
- **Prisma + MySQL** — 20+ models
- **iron-session** — encrypted cookie auth (no JWT)
- **Docker** — one-command local setup (`docker compose up --build`)
