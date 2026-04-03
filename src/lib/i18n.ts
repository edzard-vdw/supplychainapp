// ─── Supported languages ───────────────────────────────────────────────────
export type Language = "en" | "ro" | "bg" | "pt";

export const LANGUAGES: Record<Language, { label: string; flag: string }> = {
  en: { label: "English",    flag: "🇬🇧" },
  ro: { label: "Română",     flag: "🇷🇴" },
  bg: { label: "Български",  flag: "🇧🇬" },
  pt: { label: "Português",  flag: "🇵🇹" },
};

// ─── Translation dictionary ────────────────────────────────────────────────
const dict: Record<Language, Record<string, string>> = {
  en: {
    // ── Navigation ──
    "nav.jobs":       "Jobs",
    "nav.orders":     "Orders",
    "nav.pipeline":   "Pipeline",
    "nav.materials":  "Materials",
    "nav.garments":   "Garments",
    "nav.impact":     "Impact",
    "nav.scanning":   "Scanning",
    "nav.statistics": "Statistics",
    "nav.stock":      "Stock",
    "nav.new_order":  "New Order",
    "nav.new_run":    "New Run",

    // ── Hub page ──
    "hub.settings":         "Settings",
    "hub.signout":          "Sign out",
    "hub.supplier_portal":  "Supplier Portal",
    "hub.pending_single":   "New order needs your attention",
    "hub.pending_many":     "new orders need your attention",
    "hub.tap_review":       "Tap to review and accept →",

    // ── Section descriptions ──
    "section.jobs.desc":      "Incoming jobs & active runs",
    "section.materials.desc": "Yarn stock and deliveries",
    "section.garments.desc":  "Scan and check garments",
    "section.impact.desc":    "Your factory's environmental data",
    "section.stock.desc":     "Yarn stock & colour codes",
    "section.orders.desc":    "Orders & pipeline",
    "section.new_order.desc": "Upload PO or create order",
    "section.new_run.desc":   "Start a new production run",

    // ── Tab names ──
    "tab.jobs":        "Jobs",
    "tab.checker":     "Checker",
    "tab.scanning":    "Scanning",
    "tab.statistics":  "Statistics",
    "tab.yarn_stock":  "Yarn Stock",
    "tab.my_factory":  "My Factory",
    "tab.overview":    "Overview",
    "tab.by_supplier": "By Supplier",

    // ── Run statuses ──
    "status.PLANNED":       "Planned",
    "status.IN_PRODUCTION": "In Production",
    "status.QC":            "QC / Scan",
    "status.SHIPPED":       "Shipping",
    "status.RECEIVED":      "Received",
    "status.COMPLETED":     "Completed",

    // ── Order statuses ──
    "order.status.DRAFT":         "Draft",
    "order.status.CONFIRMED":     "Submitted",
    "order.status.ACKNOWLEDGED":  "Accepted",
    "order.status.IN_PRODUCTION": "In Production",
    "order.status.QC":            "Quality Check",
    "order.status.SHIPPED":       "Shipped",
    "order.status.DELIVERED":     "Delivered",
    "order.status.CANCELLED":     "Cancelled",

    // ── CTAs ──
    "cta.accept_job":          "Accept Job",
    "cta.start_production":    "Start Production",
    "cta.production_complete": "Production Complete → QC / Scan",
    "cta.scanning_complete":   "Scanning Complete → Ship",
    "cta.confirm_received":    "Confirm Goods Received",
    "cta.save":                "Save",
    "cta.cancel":              "Cancel",
    "cta.scan":                "Scan",
    "cta.view_details":        "View Details",

    // ── Jobs view ──
    "jobs.pending_title":      "New Jobs",
    "jobs.pending_empty":      "No new jobs — you're all caught up.",
    "jobs.active_title":       "Active Runs",
    "jobs.active_empty":       "No active production runs.",
    "jobs.due":                "Due",
    "jobs.quantity":           "Quantity",
    "jobs.sizes":              "sizes",
    "jobs.units":              "units",
    "jobs.accept_prompt":      "Review and accept this job to begin production.",
    "jobs.pipeline_empty":     "No runs in this stage.",

    // ── Run detail ──
    "run.planned.title":         "Order Summary",
    "run.planned.desc":          "Review the order details, then start production when you're ready.",
    "run.planned.desc_short":    "Start production first",
    "run.in_production.title":   "In Production",
    "run.in_production.desc":    "Manufacturing is underway. Move to QC when production is complete.",
    "run.in_production.desc_short": "Move to QC to scan",
    "run.qc.title":              "QC / Scanning",
    "run.qc.desc":               "Scan each garment to tag it and track your progress.",
    "run.shipped.title":         "Shipped",
    "run.shipped.desc":          "Goods are on their way. Awaiting receipt confirmation.",
    "run.received.title":        "Received",
    "run.received.desc":         "Goods have been received by Sheep Inc.",

    // ── Start production modal ──
    "modal.start.title":         "Start Production",
    "modal.start.select_colours":"Select Colours",
    "modal.start.all_colours":   "All colours in one run",
    "modal.start.manufacturing": "Manufacturing Details",
    "modal.start.yarn_stock":    "Yarn Stock",
    "modal.start.select_yarn":   "Select yarn lot...",
    "modal.start.colour_code":   "Colour Code",
    "modal.start.lot_number":    "Lot Number",
    "modal.start.gauge":         "Machine Gauge",
    "modal.start.ply":           "Knitwear Ply",
    "modal.start.stitch":        "Stitch Type",
    "modal.start.washing":       "Washing Program",
    "modal.start.temp":          "Temp (°C)",
    "modal.start.ex_factory":    "Expected Ex-Factory",
    "modal.start.no_yarn":       "No yarn stock available. Upload a delivery note in Materials first.",

    // ── Scan page ──
    "scan.title":            "Scan Garments",
    "scan.finisher_label":   "Finisher",
    "scan.finisher_prompt":  "Enter finisher name before scanning",
    "scan.finisher_set":     "Scanning:",
    "scan.finisher_edit":    "Edit",
    "scan.no_finisher":      "No finisher set — go back to set one",
    "scan.nfc_tab":          "NFC",
    "scan.qr_tab":           "QR Code",
    "scan.nfc_ready":        "Hold NFC tag to device",
    "scan.qr_ready":         "Point camera at QR code",
    "scan.progress":         "scanned",
    "scan.complete":         "All garments scanned",
    "scan.success":          "Garment tagged",
    "scan.error_duplicate":  "Tag already used",

    // ── Materials ──
    "materials.title":       "Yarn Stock",
    "materials.delivery":    "Delivery",
    "materials.lot":         "Lot",
    "materials.remaining":   "Remaining",
    "materials.cones":       "Cones",
    "materials.no_stock":    "No yarn stock yet. Upload a delivery note to get started.",
    "materials.upload":      "Upload Delivery Note",

    // ── Order detail ──
    "order.title":           "Order Details",
    "order.ref":             "PO Reference",
    "order.due":             "Due Date",
    "order.client":          "Client",
    "order.product":         "Product",
    "order.size":            "Size",
    "order.quantity":        "Qty",
    "order.accept_prompt":   "Review the order carefully before accepting.",
    "order.accept_success":  "Order accepted — go to Jobs to start production.",

    // ── Help: jobs view ──
    "help.jobs.title": "Your Jobs",
    "help.jobs.step1": "📋 New jobs from Sheep Inc appear under 'New Jobs'",
    "help.jobs.step2": "✅ Tap 'Accept Job' to confirm you'll take it on",
    "help.jobs.step3": "🏭 Once accepted, a production run is created automatically",
    "help.jobs.step4": "📱 Tap a run to open it and move through the production stages",
    "help.jobs.tip":   "Use the Pipeline tab to see all your runs sorted by stage at a glance.",

    // ── Help: run detail ──
    "help.run.title": "Production Run",
    "help.run.step1": "🧶 Choose your yarn lot and fill in the manufacturing details",
    "help.run.step2": "🏭 Tap 'Start Production' to begin — the run date is set automatically",
    "help.run.step3": "📱 When done, move to QC and scan each garment with NFC or QR",
    "help.run.step4": "📦 Mark as Shipped once everything is packed and collected",
    "help.run.tip":   "The ex-factory date helps Sheep Inc plan logistics — fill it in when you know it.",

    // ── Help: scan ──
    "help.scan.title": "Garment Scanning",
    "help.scan.step1": "👤 Set the finisher name before you start scanning",
    "help.scan.step2": "📱 Use NFC (tap tag) or QR (camera) to scan each garment",
    "help.scan.step3": "✅ Each scan tags the garment and adds it to the run count",
    "help.scan.step4": "📦 When all garments are scanned, return to the run to ship",
    "help.scan.tip":   "If a garment has already been tagged, the scan will be rejected — check the garment list.",

    // ── Help: materials ──
    "help.materials.title": "Yarn & Materials",
    "help.materials.step1": "📄 When yarn arrives, upload the delivery note PDF",
    "help.materials.step2": "✅ Review the parsed data, then confirm the delivery",
    "help.materials.step3": "🧶 Your yarn stock updates automatically by colour and lot",
    "help.materials.step4": "🔗 When starting production, select the yarn lot to link it",
    "help.materials.tip":   "Tap a colour row to see individual lots with remaining stock.",

    // ── Help: order detail ──
    "help.order.title": "Order Details",
    "help.order.step1": "👀 Review the order — check products, sizes and quantities",
    "help.order.step2": "✅ If everything looks correct, go back and accept the job",
    "help.order.step3": "🏭 Once accepted, go to Jobs to start production",
    "help.order.step4": "📦 Update status as you progress through production",
    "help.order.tip":   "If a quantity is wrong, contact Sheep Inc before accepting.",

    // ── Garment checker ──
    "garment.checker.title":          "Garment Checker",
    "garment.checker.subtitle":       "Scan or enter a code to verify a garment and trace its origin",
    "garment.checker.type_code":      "Type Code",
    "garment.checker.qr_scan":        "QR Scan",
    "garment.checker.placeholder":    "Enter garment code, NFC tag, or QR value...",
    "garment.checker.check":          "Check",
    "garment.checker.point_qr":       "Point at QR code",
    "garment.checker.tap_qr":         "Tap to scan QR",
    "garment.checker.nfc_required":   "NFC requires Chrome on Android",
    "garment.checker.waiting_nfc":    "Waiting for NFC tag...",
    "garment.checker.tap_nfc":        "Tap to scan NFC",
    "garment.checker.found":          "Garment Found",
    "garment.checker.not_registered": "Not Registered",
    "garment.checker.full_details":   "Full details",
    "garment.checker.field_code":     "Code",
    "garment.checker.field_product":  "Product",
    "garment.checker.field_size":     "Size",
    "garment.checker.field_tagged":   "Tagged",
    "garment.checker.trace":          "Production Trace",
    "garment.checker.run_status":     "Run Status",
    "garment.checker.supplier":       "Supplier",
    "garment.checker.client":         "Client",
    "garment.checker.recent_scans":   "Recent Scans",
    "garment.checker.unregistered":   "This code isn't linked to any garment. Would you like to register it to a production run?",
    "garment.checker.register_btn":   "Register to Production Run",
    "garment.checker.select_run":     "Select Production Run",
    "garment.checker.choose_run":     "Choose a run...",
    "garment.checker.register":       "Register",
    "garment.checker.registering":    "Registering...",
    "garment.checker.recent":         "Recent Garments",
    "garment.checker.tagged":         "Tagged",
    "garment.checker.untagged":       "Untagged",
    "garment.checker.no_garments":    "No garments yet",

    // ── Settings: supplier account ──
    "settings.account.title":         "Account",
    "settings.account.subtitle":      "Your personal account settings.",
    "settings.account.name":          "Name",
    "settings.account.email":         "Email",
    "settings.account.language":      "Interface Language",
    "settings.account.language_hint": "The supplier portal will display in your chosen language.",
  },

  ro: {
    // ── Navigation ──
    "nav.jobs":       "Comenzi",
    "nav.orders":     "Ordine",
    "nav.pipeline":   "Stadii",
    "nav.materials":  "Materiale",
    "nav.garments":   "Articole",
    "nav.impact":     "Impact",
    "nav.scanning":   "Scanare",
    "nav.statistics": "Statistici",
    "nav.stock":      "Stoc",
    "nav.new_order":  "Comandă Nouă",
    "nav.new_run":    "Producție Nouă",

    // ── Hub page ──
    "hub.settings":         "Setări",
    "hub.signout":          "Deconectare",
    "hub.supplier_portal":  "Portal Furnizor",
    "hub.pending_single":   "O comandă nouă necesită atenție",
    "hub.pending_many":     "comenzi noi necesită atenție",
    "hub.tap_review":       "Apasă pentru a revizui și accepta →",

    // ── Section descriptions ──
    "section.jobs.desc":      "Comenzi active și producție",
    "section.materials.desc": "Stoc fire și livrări",
    "section.garments.desc":  "Scanează și verifică articole",
    "section.impact.desc":    "Datele de mediu ale fabricii",
    "section.stock.desc":     "Stoc fire & coduri culori",
    "section.orders.desc":    "Comenzi & stadii",
    "section.new_order.desc": "Încarcă PO sau creează comandă",
    "section.new_run.desc":   "Pornește o producție nouă",

    // ── Tab names ──
    "tab.jobs":        "Comenzi",
    "tab.checker":     "Verificare",
    "tab.scanning":    "Scanare",
    "tab.statistics":  "Statistici",
    "tab.yarn_stock":  "Stoc Fire",
    "tab.my_factory":  "Fabrica Mea",
    "tab.overview":    "Prezentare",
    "tab.by_supplier": "Pe Furnizor",

    // ── Run statuses ──
    "status.PLANNED":       "Planificat",
    "status.IN_PRODUCTION": "În Producție",
    "status.QC":            "CQ / Scanare",
    "status.SHIPPED":       "Expediat",
    "status.RECEIVED":      "Recepționat",
    "status.COMPLETED":     "Finalizat",

    // ── Order statuses ──
    "order.status.DRAFT":         "Ciornă",
    "order.status.CONFIRMED":     "Trimis",
    "order.status.ACKNOWLEDGED":  "Acceptat",
    "order.status.IN_PRODUCTION": "În Producție",
    "order.status.QC":            "Control Calitate",
    "order.status.SHIPPED":       "Expediat",
    "order.status.DELIVERED":     "Livrat",
    "order.status.CANCELLED":     "Anulat",

    // ── CTAs ──
    "cta.accept_job":          "Acceptă Comanda",
    "cta.start_production":    "Începe Producția",
    "cta.production_complete": "Producție Finalizată → CQ / Scanare",
    "cta.scanning_complete":   "Scanare Finalizată → Expediere",
    "cta.confirm_received":    "Confirmă Primirea Mărfii",
    "cta.save":                "Salvează",
    "cta.cancel":              "Anulează",
    "cta.scan":                "Scanează",
    "cta.view_details":        "Vezi Detalii",

    // ── Jobs view ──
    "jobs.pending_title":   "Comenzi Noi",
    "jobs.pending_empty":   "Nicio comandă nouă — ești la zi.",
    "jobs.active_title":    "Producție Activă",
    "jobs.active_empty":    "Nicio producție activă.",
    "jobs.due":             "Termen",
    "jobs.quantity":        "Cantitate",
    "jobs.sizes":           "mărimi",
    "jobs.units":           "bucăți",
    "jobs.accept_prompt":   "Verifică și acceptă această comandă pentru a începe producția.",
    "jobs.pipeline_empty":  "Niciun rând în această etapă.",

    // ── Run detail ──
    "run.planned.title":           "Rezumatul Comenzii",
    "run.planned.desc":            "Verifică detaliile comenzii, apoi începe producția când ești pregătit.",
    "run.planned.desc_short":      "Începe producția mai întâi",
    "run.in_production.title":     "În Producție",
    "run.in_production.desc":      "Producția este în curs. Treci la CQ când producția este completă.",
    "run.in_production.desc_short":"Treci la CQ pentru a scana",
    "run.qc.title":             "CQ / Scanare",
    "run.qc.desc":              "Scanează fiecare articol pentru a-l eticheta și a urmări progresul.",
    "run.shipped.title":        "Expediat",
    "run.shipped.desc":         "Marfa este în drum. Se așteaptă confirmarea recepției.",
    "run.received.title":       "Recepționat",
    "run.received.desc":        "Marfa a fost primită de Sheep Inc.",

    // ── Start production modal ──
    "modal.start.title":          "Începe Producția",
    "modal.start.select_colours": "Selectează Culorile",
    "modal.start.all_colours":    "Toate culorile într-o singură producție",
    "modal.start.manufacturing":  "Detalii Producție",
    "modal.start.yarn_stock":     "Stoc Fire",
    "modal.start.select_yarn":    "Selectează lotul de fire...",
    "modal.start.colour_code":    "Cod Culoare",
    "modal.start.lot_number":     "Număr Lot",
    "modal.start.gauge":          "Finețe Mașină",
    "modal.start.ply":            "Fir Tricotat",
    "modal.start.stitch":         "Tip Punct",
    "modal.start.washing":        "Program Spălare",
    "modal.start.temp":           "Temp (°C)",
    "modal.start.ex_factory":     "Data Livrare Fabrică",
    "modal.start.no_yarn":        "Niciun stoc de fire disponibil. Încarcă o notă de livrare în Materiale.",

    // ── Scan page ──
    "scan.title":           "Scanare Articole",
    "scan.finisher_label":  "Finiseur",
    "scan.finisher_prompt": "Introduceți numele finiseurului înainte de scanare",
    "scan.finisher_set":    "Scanare:",
    "scan.finisher_edit":   "Editează",
    "scan.no_finisher":     "Niciun finiseur setat — reveniți pentru a seta unul",
    "scan.nfc_tab":         "NFC",
    "scan.qr_tab":          "Cod QR",
    "scan.nfc_ready":       "Apropiați eticheta NFC de dispozitiv",
    "scan.qr_ready":        "Îndreptați camera spre codul QR",
    "scan.progress":        "scanate",
    "scan.complete":        "Toate articolele scanate",
    "scan.success":         "Articol etichetat",
    "scan.error_duplicate": "Etichetă deja folosită",

    // ── Materials ──
    "materials.title":    "Stoc Fire",
    "materials.delivery": "Livrare",
    "materials.lot":      "Lot",
    "materials.remaining":"Rămas",
    "materials.cones":    "Conuri",
    "materials.no_stock": "Niciun stoc de fire. Încarcă o notă de livrare pentru a începe.",
    "materials.upload":   "Încarcă Notă de Livrare",

    // ── Order detail ──
    "order.title":          "Detalii Comandă",
    "order.ref":            "Referință Comandă",
    "order.due":            "Termen Limită",
    "order.client":         "Client",
    "order.product":        "Produs",
    "order.size":           "Mărime",
    "order.quantity":       "Cant.",
    "order.accept_prompt":  "Verificați comanda cu atenție înainte de acceptare.",
    "order.accept_success": "Comandă acceptată — mergeți la Comenzi pentru a începe producția.",

    // ── Help: jobs ──
    "help.jobs.title": "Comenzile Tale",
    "help.jobs.step1": "📋 Comenzile noi de la Sheep Inc apar la 'Comenzi Noi'",
    "help.jobs.step2": "✅ Apasă 'Acceptă Comanda' pentru a o prelua",
    "help.jobs.step3": "🏭 Odată acceptată, o producție este creată automat",
    "help.jobs.step4": "📱 Deschide producția și parcurge etapele de fabricație",
    "help.jobs.tip":   "Folosiți tab-ul Stadii pentru a vedea toate producțiile sortate pe etape.",

    // ── Help: run ──
    "help.run.title": "Producție",
    "help.run.step1": "🧶 Alegeți lotul de fire și completați detaliile de fabricație",
    "help.run.step2": "🏭 Apasă 'Începe Producția' — data de start se setează automat",
    "help.run.step3": "📱 Când gata, treceți la CQ și scanați fiecare articol",
    "help.run.step4": "📦 Marcați ca Expediat odată ce totul este ambalat și ridicat",
    "help.run.tip":   "Data livrare fabrică ajută Sheep Inc să planifice logistica — completați-o când o știți.",

    // ── Help: scan ──
    "help.scan.title": "Scanare Articole",
    "help.scan.step1": "👤 Setați numele finiseurului înainte de a începe scanarea",
    "help.scan.step2": "📱 Folosiți NFC (atingeți eticheta) sau QR (cameră) pentru fiecare articol",
    "help.scan.step3": "✅ Fiecare scanare etichetează articolul și adaugă la numărul producției",
    "help.scan.step4": "📦 Când toate articolele sunt scanate, reveniți la producție pentru expediere",
    "help.scan.tip":   "Dacă un articol a fost deja etichetat, scanarea va fi respinsă.",

    // ── Help: materials ──
    "help.materials.title": "Fire & Materiale",
    "help.materials.step1": "📄 Când sosesc firele, încărcați nota de livrare PDF",
    "help.materials.step2": "✅ Verificați datele extrase, apoi confirmați livrarea",
    "help.materials.step3": "🧶 Stocul de fire se actualizează automat pe culoare și lot",
    "help.materials.step4": "🔗 La începerea producției, selectați lotul de fire pentru legătură",
    "help.materials.tip":   "Apăsați pe un rând de culoare pentru a vedea loturile individuale cu stoc rămas.",

    // ── Help: order ──
    "help.order.title": "Detalii Comandă",
    "help.order.step1": "👀 Verificați comanda — produse, mărimi și cantități",
    "help.order.step2": "✅ Dacă totul este corect, mergeți înapoi și acceptați comanda",
    "help.order.step3": "🏭 Odată acceptată, mergeți la Comenzi pentru a începe producția",
    "help.order.step4": "📦 Actualizați statusul pe măsură ce avansați în producție",
    "help.order.tip":   "Dacă o cantitate este greșită, contactați Sheep Inc înainte de acceptare.",

    // ── Garment checker ──
    "garment.checker.title":          "Verificator Articole",
    "garment.checker.subtitle":       "Scanează sau introdu un cod pentru a verifica un articol și a-i urmări originea",
    "garment.checker.type_code":      "Tastează Cod",
    "garment.checker.qr_scan":        "Scanare QR",
    "garment.checker.placeholder":    "Introdu codul articolului, tag NFC sau valoare QR...",
    "garment.checker.check":          "Verifică",
    "garment.checker.point_qr":       "Îndreaptă spre codul QR",
    "garment.checker.tap_qr":         "Apasă pentru a scana QR",
    "garment.checker.nfc_required":   "NFC necesită Chrome pe Android",
    "garment.checker.waiting_nfc":    "Așteptând tag NFC...",
    "garment.checker.tap_nfc":        "Apasă pentru a scana NFC",
    "garment.checker.found":          "Articol Găsit",
    "garment.checker.not_registered": "Neînregistrat",
    "garment.checker.full_details":   "Detalii complete",
    "garment.checker.field_code":     "Cod",
    "garment.checker.field_product":  "Produs",
    "garment.checker.field_size":     "Mărime",
    "garment.checker.field_tagged":   "Etichetat",
    "garment.checker.trace":          "Trasabilitate Producție",
    "garment.checker.run_status":     "Status Producție",
    "garment.checker.supplier":       "Furnizor",
    "garment.checker.client":         "Client",
    "garment.checker.recent_scans":   "Scanări Recente",
    "garment.checker.unregistered":   "Acest cod nu este legat de niciun articol. Vrei să îl înregistrezi la o producție?",
    "garment.checker.register_btn":   "Înregistrează la Producție",
    "garment.checker.select_run":     "Selectează Producția",
    "garment.checker.choose_run":     "Alege o producție...",
    "garment.checker.register":       "Înregistrează",
    "garment.checker.registering":    "Înregistrare...",
    "garment.checker.recent":         "Articole Recente",
    "garment.checker.tagged":         "Etichetat",
    "garment.checker.untagged":       "Neetichetat",
    "garment.checker.no_garments":    "Niciun articol încă",

    // ── Settings: supplier account ──
    "settings.account.title":         "Cont",
    "settings.account.subtitle":      "Setările tale personale de cont.",
    "settings.account.name":          "Nume",
    "settings.account.email":         "Email",
    "settings.account.language":      "Limba Interfeței",
    "settings.account.language_hint": "Portalul furnizorului se va afișa în limba aleasă.",
  },

  bg: {
    // ── Navigation ──
    "nav.jobs":       "Поръчки",
    "nav.orders":     "Заявки",
    "nav.pipeline":   "Етапи",
    "nav.materials":  "Материали",
    "nav.garments":   "Артикули",
    "nav.impact":     "Въздействие",
    "nav.scanning":   "Сканиране",
    "nav.statistics": "Статистики",
    "nav.stock":      "Наличност",
    "nav.new_order":  "Нова Поръчка",
    "nav.new_run":    "Ново Производство",

    // ── Hub page ──
    "hub.settings":         "Настройки",
    "hub.signout":          "Изход",
    "hub.supplier_portal":  "Портал на Доставчика",
    "hub.pending_single":   "Нова поръчка изисква внимание",
    "hub.pending_many":     "нови поръчки изискват внимание",
    "hub.tap_review":       "Докоснете за преглед и приемане →",

    // ── Section descriptions ──
    "section.jobs.desc":      "Активни поръчки и производство",
    "section.materials.desc": "Наличност прежда и доставки",
    "section.garments.desc":  "Сканирайте и проверете артикули",
    "section.impact.desc":    "Екологичните данни на фабриката",
    "section.stock.desc":     "Наличност прежда & кодове цветове",
    "section.orders.desc":    "Поръчки & етапи",
    "section.new_order.desc": "Качи PO или създай поръчка",
    "section.new_run.desc":   "Стартирай ново производство",

    // ── Tab names ──
    "tab.jobs":        "Поръчки",
    "tab.checker":     "Проверка",
    "tab.scanning":    "Сканиране",
    "tab.statistics":  "Статистики",
    "tab.yarn_stock":  "Прежда",
    "tab.my_factory":  "Моята Фабрика",
    "tab.overview":    "Преглед",
    "tab.by_supplier": "По Доставчик",

    // ── Run statuses ──
    "status.PLANNED":       "Планирано",
    "status.IN_PRODUCTION": "В Производство",
    "status.QC":            "КК / Сканиране",
    "status.SHIPPED":       "Изпратено",
    "status.RECEIVED":      "Получено",
    "status.COMPLETED":     "Завършено",

    // ── Order statuses ──
    "order.status.DRAFT":         "Чернова",
    "order.status.CONFIRMED":     "Изпратено",
    "order.status.ACKNOWLEDGED":  "Прието",
    "order.status.IN_PRODUCTION": "В Производство",
    "order.status.QC":            "Контрол Качество",
    "order.status.SHIPPED":       "Изпратено",
    "order.status.DELIVERED":     "Доставено",
    "order.status.CANCELLED":     "Отменено",

    // ── CTAs ──
    "cta.accept_job":          "Приеми Поръчката",
    "cta.start_production":    "Започни Производство",
    "cta.production_complete": "Производството завършено → КК / Сканиране",
    "cta.scanning_complete":   "Сканирането завършено → Изпращане",
    "cta.confirm_received":    "Потвърди Получаването",
    "cta.save":                "Запази",
    "cta.cancel":              "Отказ",
    "cta.scan":                "Сканирай",
    "cta.view_details":        "Виж Детайли",

    // ── Jobs view ──
    "jobs.pending_title":   "Нови Поръчки",
    "jobs.pending_empty":   "Няма нови поръчки — всичко е наред.",
    "jobs.active_title":    "Активно Производство",
    "jobs.active_empty":    "Няма активно производство.",
    "jobs.due":             "Краен срок",
    "jobs.quantity":        "Количество",
    "jobs.sizes":           "размери",
    "jobs.units":           "бройки",
    "jobs.accept_prompt":   "Прегледайте и приемете тази поръчка, за да започнете производство.",
    "jobs.pipeline_empty":  "Няма производство в този етап.",

    // ── Run detail ──
    "run.planned.title":           "Обобщение на поръчката",
    "run.planned.desc":            "Прегледайте детайлите, след което започнете производство.",
    "run.planned.desc_short":      "Първо започнете производство",
    "run.in_production.title":     "В Производство",
    "run.in_production.desc":      "Производството е в ход. Преминете към КК когато приключи.",
    "run.in_production.desc_short":"Преминете към КК за сканиране",
    "run.qc.title":             "КК / Сканиране",
    "run.qc.desc":              "Сканирайте всеки артикул за маркиране и проследяване.",
    "run.shipped.title":        "Изпратено",
    "run.shipped.desc":         "Стоките са в движение. Изчаква се потвърждение за получаване.",
    "run.received.title":       "Получено",
    "run.received.desc":        "Стоките са получени от Sheep Inc.",

    // ── Start production modal ──
    "modal.start.title":          "Започни Производство",
    "modal.start.select_colours": "Избери Цветове",
    "modal.start.all_colours":    "Всички цветове в едно производство",
    "modal.start.manufacturing":  "Производствени Детайли",
    "modal.start.yarn_stock":     "Запас Прежда",
    "modal.start.select_yarn":    "Избери лот прежда...",
    "modal.start.colour_code":    "Код Цвят",
    "modal.start.lot_number":     "Номер Лот",
    "modal.start.gauge":          "Фина на Машина",
    "modal.start.ply":            "Брой Нишки",
    "modal.start.stitch":         "Вид Бод",
    "modal.start.washing":        "Програма за Пране",
    "modal.start.temp":           "Темп. (°C)",
    "modal.start.ex_factory":     "Дата от Завода",
    "modal.start.no_yarn":        "Няма наличен запас прежда. Качете бележка за доставка в Материали.",

    // ── Scan page ──
    "scan.title":           "Сканиране Артикули",
    "scan.finisher_label":  "Финишор",
    "scan.finisher_prompt": "Въведете името на финишора преди сканиране",
    "scan.finisher_set":    "Сканира:",
    "scan.finisher_edit":   "Редактирай",
    "scan.no_finisher":     "Няма зададен финишор — върнете се, за да зададете",
    "scan.nfc_tab":         "NFC",
    "scan.qr_tab":          "QR Код",
    "scan.nfc_ready":       "Доближете NFC таг до устройството",
    "scan.qr_ready":        "Насочете камерата към QR кода",
    "scan.progress":        "сканирани",
    "scan.complete":        "Всички артикули сканирани",
    "scan.success":         "Артикулът е маркиран",
    "scan.error_duplicate": "Тагът вече е използван",

    // ── Materials ──
    "materials.title":    "Запас Прежда",
    "materials.delivery": "Доставка",
    "materials.lot":      "Лот",
    "materials.remaining":"Оставащо",
    "materials.cones":    "Конуси",
    "materials.no_stock": "Няма запас прежда. Качете бележка за доставка, за да започнете.",
    "materials.upload":   "Качи Бележка за Доставка",

    // ── Order detail ──
    "order.title":          "Детайли Поръчка",
    "order.ref":            "Референция",
    "order.due":            "Краен Срок",
    "order.client":         "Клиент",
    "order.product":        "Продукт",
    "order.size":           "Размер",
    "order.quantity":       "Кол.",
    "order.accept_prompt":  "Прегледайте поръчката внимателно преди приемане.",
    "order.accept_success": "Поръчката е приета — отидете в Поръчки, за да започнете производство.",

    // ── Help: jobs ──
    "help.jobs.title": "Вашите Поръчки",
    "help.jobs.step1": "📋 Нови поръчки от Sheep Inc се появяват в 'Нови Поръчки'",
    "help.jobs.step2": "✅ Натиснете 'Приеми Поръчката' за потвърждение",
    "help.jobs.step3": "🏭 При приемане, производство се създава автоматично",
    "help.jobs.step4": "📱 Отворете производството и преминете през етапите",
    "help.jobs.tip":   "Използвайте таб 'Етапи' за преглед на всички производства по етап.",

    // ── Help: run ──
    "help.run.title": "Производство",
    "help.run.step1": "🧶 Изберете лот прежда и попълнете производствените детайли",
    "help.run.step2": "🏭 Натиснете 'Започни Производство' — датата се задава автоматично",
    "help.run.step3": "📱 Когато приключи, преминете към КК и сканирайте всеки артикул",
    "help.run.step4": "📦 Маркирайте като Изпратено след опаковане и вдигане",
    "help.run.tip":   "Датата от завода помага на Sheep Inc да планира логистиката.",

    // ── Help: scan ──
    "help.scan.title": "Сканиране Артикули",
    "help.scan.step1": "👤 Задайте името на финишора преди да започнете сканирането",
    "help.scan.step2": "📱 Използвайте NFC (докоснете тага) или QR (камера) за всеки артикул",
    "help.scan.step3": "✅ Всяко сканиране маркира артикула и добавя към броя",
    "help.scan.step4": "📦 Когато всички са сканирани, върнете се за изпращане",
    "help.scan.tip":   "Ако артикул вече е маркиран, сканирането ще бъде отхвърлено.",

    // ── Help: materials ──
    "help.materials.title": "Прежда & Материали",
    "help.materials.step1": "📄 При пристигане на прежда, качете PDF с бележка за доставка",
    "help.materials.step2": "✅ Прегледайте разпознатите данни, след това потвърдете доставката",
    "help.materials.step3": "🧶 Запасът от прежда се обновява автоматично по цвят и лот",
    "help.materials.step4": "🔗 При стартиране на производство, изберете лота за свързване",
    "help.materials.tip":   "Натиснете ред с цвят за преглед на отделните лотове.",

    // ── Help: order ──
    "help.order.title": "Детайли Поръчка",
    "help.order.step1": "👀 Прегледайте поръчката — продукти, размери и количества",
    "help.order.step2": "✅ Ако всичко е правилно, върнете се и приемете поръчката",
    "help.order.step3": "🏭 При приемане, отидете в Поръчки за стартиране на производство",
    "help.order.step4": "📦 Обновявайте статуса при напредване на производството",
    "help.order.tip":   "При грешно количество, свържете се с Sheep Inc преди приемане.",

    // ── Garment checker ──
    "garment.checker.title":          "Проверка Артикули",
    "garment.checker.subtitle":       "Сканирайте или въведете код за проверка на артикул и проследяване на произхода",
    "garment.checker.type_code":      "Въведи Код",
    "garment.checker.qr_scan":        "Сканиране QR",
    "garment.checker.placeholder":    "Въведи код артикул, NFC таг или QR стойност...",
    "garment.checker.check":          "Провери",
    "garment.checker.point_qr":       "Насочете към QR кода",
    "garment.checker.tap_qr":         "Докоснете за сканиране QR",
    "garment.checker.nfc_required":   "NFC изисква Chrome на Android",
    "garment.checker.waiting_nfc":    "Изчакване на NFC таг...",
    "garment.checker.tap_nfc":        "Докоснете за сканиране NFC",
    "garment.checker.found":          "Артикулът е намерен",
    "garment.checker.not_registered": "Нерегистриран",
    "garment.checker.full_details":   "Пълни детайли",
    "garment.checker.field_code":     "Код",
    "garment.checker.field_product":  "Продукт",
    "garment.checker.field_size":     "Размер",
    "garment.checker.field_tagged":   "Маркиран",
    "garment.checker.trace":          "Производствено Проследяване",
    "garment.checker.run_status":     "Статус Производство",
    "garment.checker.supplier":       "Доставчик",
    "garment.checker.client":         "Клиент",
    "garment.checker.recent_scans":   "Последни Сканирания",
    "garment.checker.unregistered":   "Този код не е свързан с артикул. Искате ли да го регистрирате в производство?",
    "garment.checker.register_btn":   "Регистрирай в Производство",
    "garment.checker.select_run":     "Избери Производство",
    "garment.checker.choose_run":     "Избери производство...",
    "garment.checker.register":       "Регистрирай",
    "garment.checker.registering":    "Регистриране...",
    "garment.checker.recent":         "Последни Артикули",
    "garment.checker.tagged":         "Маркиран",
    "garment.checker.untagged":       "Немаркиран",
    "garment.checker.no_garments":    "Няма артикули",

    // ── Settings: supplier account ──
    "settings.account.title":         "Профил",
    "settings.account.subtitle":      "Вашите лични настройки за профила.",
    "settings.account.name":          "Име",
    "settings.account.email":         "Имейл",
    "settings.account.language":      "Език на Интерфейса",
    "settings.account.language_hint": "Порталът на доставчика ще се показва на избрания от вас език.",
  },

  pt: {
    // ── Navigation ──
    "nav.jobs":       "Trabalhos",
    "nav.orders":     "Encomendas",
    "nav.pipeline":   "Fases",
    "nav.materials":  "Materiais",
    "nav.garments":   "Artigos",
    "nav.impact":     "Impacto",
    "nav.scanning":   "Digitalização",
    "nav.statistics": "Estatísticas",
    "nav.stock":      "Stock",
    "nav.new_order":  "Nova Encomenda",
    "nav.new_run":    "Nova Produção",

    // ── Hub page ──
    "hub.settings":         "Definições",
    "hub.signout":          "Sair",
    "hub.supplier_portal":  "Portal do Fornecedor",
    "hub.pending_single":   "Uma nova encomenda precisa de atenção",
    "hub.pending_many":     "novas encomendas precisam de atenção",
    "hub.tap_review":       "Toque para rever e aceitar →",

    // ── Section descriptions ──
    "section.jobs.desc":      "Trabalhos ativos e produção",
    "section.materials.desc": "Stock de fio e entregas",
    "section.garments.desc":  "Digitalizar e verificar artigos",
    "section.impact.desc":    "Dados ambientais da fábrica",
    "section.stock.desc":     "Stock de fio & códigos de cor",
    "section.orders.desc":    "Encomendas & fases",
    "section.new_order.desc": "Carregar PO ou criar encomenda",
    "section.new_run.desc":   "Iniciar uma nova produção",

    // ── Tab names ──
    "tab.jobs":        "Trabalhos",
    "tab.checker":     "Verificação",
    "tab.scanning":    "Digitalização",
    "tab.statistics":  "Estatísticas",
    "tab.yarn_stock":  "Stock de Fio",
    "tab.my_factory":  "A Minha Fábrica",
    "tab.overview":    "Visão Geral",
    "tab.by_supplier": "Por Fornecedor",

    // ── Run statuses ──
    "status.PLANNED":       "Planeado",
    "status.IN_PRODUCTION": "Em Produção",
    "status.QC":            "CQ / Digitalização",
    "status.SHIPPED":       "Enviado",
    "status.RECEIVED":      "Recebido",
    "status.COMPLETED":     "Concluído",

    // ── Order statuses ──
    "order.status.DRAFT":         "Rascunho",
    "order.status.CONFIRMED":     "Submetido",
    "order.status.ACKNOWLEDGED":  "Aceite",
    "order.status.IN_PRODUCTION": "Em Produção",
    "order.status.QC":            "Controlo de Qualidade",
    "order.status.SHIPPED":       "Enviado",
    "order.status.DELIVERED":     "Entregue",
    "order.status.CANCELLED":     "Cancelado",

    // ── CTAs ──
    "cta.accept_job":          "Aceitar Trabalho",
    "cta.start_production":    "Iniciar Produção",
    "cta.production_complete": "Produção Concluída → CQ / Digitalização",
    "cta.scanning_complete":   "Digitalização Concluída → Envio",
    "cta.confirm_received":    "Confirmar Receção de Mercadoria",
    "cta.save":                "Guardar",
    "cta.cancel":              "Cancelar",
    "cta.scan":                "Digitalizar",
    "cta.view_details":        "Ver Detalhes",

    // ── Jobs view ──
    "jobs.pending_title":   "Novos Trabalhos",
    "jobs.pending_empty":   "Sem novos trabalhos — está tudo em dia.",
    "jobs.active_title":    "Produção Ativa",
    "jobs.active_empty":    "Sem produção ativa.",
    "jobs.due":             "Prazo",
    "jobs.quantity":        "Quantidade",
    "jobs.sizes":           "tamanhos",
    "jobs.units":           "unidades",
    "jobs.accept_prompt":   "Reveja e aceite este trabalho para iniciar a produção.",
    "jobs.pipeline_empty":  "Sem produção nesta fase.",

    // ── Run detail ──
    "run.planned.title":           "Resumo da Encomenda",
    "run.planned.desc":            "Reveja os detalhes da encomenda e inicie a produção quando estiver pronto.",
    "run.planned.desc_short":      "Inicie a produção primeiro",
    "run.in_production.title":     "Em Produção",
    "run.in_production.desc":      "Produção em curso. Avance para CQ quando a produção estiver concluída.",
    "run.in_production.desc_short":"Avance para CQ para escanear",
    "run.qc.title":             "CQ / Digitalização",
    "run.qc.desc":              "Digitalize cada artigo para o etiquetar e acompanhar o progresso.",
    "run.shipped.title":        "Enviado",
    "run.shipped.desc":         "Mercadoria a caminho. A aguardar confirmação de receção.",
    "run.received.title":       "Recebido",
    "run.received.desc":        "Mercadoria recebida pela Sheep Inc.",

    // ── Start production modal ──
    "modal.start.title":          "Iniciar Produção",
    "modal.start.select_colours": "Selecionar Cores",
    "modal.start.all_colours":    "Todas as cores numa só produção",
    "modal.start.manufacturing":  "Detalhes de Fabrico",
    "modal.start.yarn_stock":     "Stock de Fio",
    "modal.start.select_yarn":    "Selecionar lote de fio...",
    "modal.start.colour_code":    "Código de Cor",
    "modal.start.lot_number":     "Número de Lote",
    "modal.start.gauge":          "Calibre da Máquina",
    "modal.start.ply":            "Torcido do Fio",
    "modal.start.stitch":         "Tipo de Ponto",
    "modal.start.washing":        "Programa de Lavagem",
    "modal.start.temp":           "Temp. (°C)",
    "modal.start.ex_factory":     "Data Ex-Fábrica",
    "modal.start.no_yarn":        "Sem stock de fio disponível. Carregue uma nota de entrega em Materiais.",

    // ── Scan page ──
    "scan.title":           "Digitalização de Artigos",
    "scan.finisher_label":  "Finalizador",
    "scan.finisher_prompt": "Introduza o nome do finalizador antes de digitalizar",
    "scan.finisher_set":    "A digitalizar:",
    "scan.finisher_edit":   "Editar",
    "scan.no_finisher":     "Sem finalizador definido — volte atrás para definir",
    "scan.nfc_tab":         "NFC",
    "scan.qr_tab":          "Código QR",
    "scan.nfc_ready":       "Aproxime a etiqueta NFC do dispositivo",
    "scan.qr_ready":        "Aponte a câmara para o código QR",
    "scan.progress":        "digitalizados",
    "scan.complete":        "Todos os artigos digitalizados",
    "scan.success":         "Artigo etiquetado",
    "scan.error_duplicate": "Etiqueta já utilizada",

    // ── Materials ──
    "materials.title":    "Stock de Fio",
    "materials.delivery": "Entrega",
    "materials.lot":      "Lote",
    "materials.remaining":"Restante",
    "materials.cones":    "Cones",
    "materials.no_stock": "Sem stock de fio. Carregue uma nota de entrega para começar.",
    "materials.upload":   "Carregar Nota de Entrega",

    // ── Order detail ──
    "order.title":          "Detalhes da Encomenda",
    "order.ref":            "Referência da Encomenda",
    "order.due":            "Data Limite",
    "order.client":         "Cliente",
    "order.product":        "Produto",
    "order.size":           "Tamanho",
    "order.quantity":       "Qtd.",
    "order.accept_prompt":  "Reveja a encomenda com atenção antes de aceitar.",
    "order.accept_success": "Encomenda aceite — vá a Trabalhos para iniciar a produção.",

    // ── Help: jobs ──
    "help.jobs.title": "Os Seus Trabalhos",
    "help.jobs.step1": "📋 Novos trabalhos da Sheep Inc aparecem em 'Novos Trabalhos'",
    "help.jobs.step2": "✅ Toque em 'Aceitar Trabalho' para confirmar",
    "help.jobs.step3": "🏭 Após aceite, uma produção é criada automaticamente",
    "help.jobs.step4": "📱 Abra a produção e avance pelas fases de fabrico",
    "help.jobs.tip":   "Use o separador Fases para ver todas as produções organizadas por etapa.",

    // ── Help: run ──
    "help.run.title": "Produção",
    "help.run.step1": "🧶 Escolha o lote de fio e preencha os detalhes de fabrico",
    "help.run.step2": "🏭 Toque em 'Iniciar Produção' — a data de início é definida automaticamente",
    "help.run.step3": "📱 Quando terminar, avance para CQ e digitalize cada artigo",
    "help.run.step4": "📦 Marque como Enviado depois de embalado e recolhido",
    "help.run.tip":   "A data ex-fábrica ajuda a Sheep Inc a planear a logística — preencha quando souber.",

    // ── Help: scan ──
    "help.scan.title": "Digitalização de Artigos",
    "help.scan.step1": "👤 Defina o nome do finalizador antes de começar a digitalizar",
    "help.scan.step2": "📱 Use NFC (toque na etiqueta) ou QR (câmara) para cada artigo",
    "help.scan.step3": "✅ Cada digitalização etiqueta o artigo e adiciona à contagem",
    "help.scan.step4": "📦 Quando todos estiverem digitalizados, volte à produção para enviar",
    "help.scan.tip":   "Se um artigo já foi etiquetado, a digitalização será rejeitada.",

    // ── Help: materials ──
    "help.materials.title": "Fio & Materiais",
    "help.materials.step1": "📄 Quando o fio chegar, carregue o PDF da nota de entrega",
    "help.materials.step2": "✅ Reveja os dados extraídos e confirme a entrega",
    "help.materials.step3": "🧶 O stock de fio atualiza automaticamente por cor e lote",
    "help.materials.step4": "🔗 Ao iniciar a produção, selecione o lote de fio para ligar",
    "help.materials.tip":   "Toque numa linha de cor para ver os lotes individuais com stock restante.",

    // ── Help: order ──
    "help.order.title": "Detalhes da Encomenda",
    "help.order.step1": "👀 Reveja a encomenda — produtos, tamanhos e quantidades",
    "help.order.step2": "✅ Se tudo estiver correto, volte atrás e aceite o trabalho",
    "help.order.step3": "🏭 Após aceite, vá a Trabalhos para iniciar a produção",
    "help.order.step4": "📦 Atualize o estado à medida que avança na produção",
    "help.order.tip":   "Se uma quantidade estiver errada, contacte a Sheep Inc antes de aceitar.",

    // ── Garment checker ──
    "garment.checker.title":          "Verificador de Artigos",
    "garment.checker.subtitle":       "Digitalize ou insira um código para verificar um artigo e rastrear a sua origem",
    "garment.checker.type_code":      "Digitar Código",
    "garment.checker.qr_scan":        "Digitalizar QR",
    "garment.checker.placeholder":    "Insira código do artigo, tag NFC ou valor QR...",
    "garment.checker.check":          "Verificar",
    "garment.checker.point_qr":       "Apontar para código QR",
    "garment.checker.tap_qr":         "Toque para digitalizar QR",
    "garment.checker.nfc_required":   "NFC requer Chrome no Android",
    "garment.checker.waiting_nfc":    "Aguardando tag NFC...",
    "garment.checker.tap_nfc":        "Toque para digitalizar NFC",
    "garment.checker.found":          "Artigo Encontrado",
    "garment.checker.not_registered": "Não Registado",
    "garment.checker.full_details":   "Detalhes completos",
    "garment.checker.field_code":     "Código",
    "garment.checker.field_product":  "Produto",
    "garment.checker.field_size":     "Tamanho",
    "garment.checker.field_tagged":   "Etiquetado",
    "garment.checker.trace":          "Rastreabilidade da Produção",
    "garment.checker.run_status":     "Estado da Produção",
    "garment.checker.supplier":       "Fornecedor",
    "garment.checker.client":         "Cliente",
    "garment.checker.recent_scans":   "Digitalizações Recentes",
    "garment.checker.unregistered":   "Este código não está ligado a nenhum artigo. Deseja registá-lo numa produção?",
    "garment.checker.register_btn":   "Registar na Produção",
    "garment.checker.select_run":     "Selecionar Produção",
    "garment.checker.choose_run":     "Escolher uma produção...",
    "garment.checker.register":       "Registar",
    "garment.checker.registering":    "A registar...",
    "garment.checker.recent":         "Artigos Recentes",
    "garment.checker.tagged":         "Etiquetado",
    "garment.checker.untagged":       "Não Etiquetado",
    "garment.checker.no_garments":    "Sem artigos ainda",

    // ── Settings: supplier account ──
    "settings.account.title":         "Conta",
    "settings.account.subtitle":      "As suas definições pessoais de conta.",
    "settings.account.name":          "Nome",
    "settings.account.email":         "Email",
    "settings.account.language":      "Idioma da Interface",
    "settings.account.language_hint": "O portal do fornecedor será exibido no idioma escolhido.",
  },
};

// ─── Translation function ──────────────────────────────────────────────────
export function t(key: string, lang: string = "en"): string {
  const language = (["en", "ro", "bg", "pt"].includes(lang) ? lang : "en") as Language;
  return dict[language][key] ?? dict.en[key] ?? key;
}

// ─── HelpStep type (matches ContextualHelp component) ──────────────────────
export type HelpStep = { icon: string; text: string };

function parseStep(raw: string): HelpStep {
  // Format: "📋 Step text here" — split emoji from rest
  const match = raw.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)\s+(.+)$/u);
  if (match) return { icon: match[1], text: match[2] };
  return { icon: "•", text: raw };
}

// ─── Helper: get all help steps for a page in a given language ─────────────
export function getHelpContent(page: "jobs" | "run" | "scan" | "materials" | "order", lang: string): {
  title: string;
  steps: HelpStep[];
  tip: string;
} {
  return {
    title: t(`help.${page}.title`, lang),
    steps: [
      t(`help.${page}.step1`, lang),
      t(`help.${page}.step2`, lang),
      t(`help.${page}.step3`, lang),
      t(`help.${page}.step4`, lang),
    ]
      .filter((s) => !s.startsWith("help.")) // drop missing keys
      .map(parseStep),
    tip: t(`help.${page}.tip`, lang),
  };
}
