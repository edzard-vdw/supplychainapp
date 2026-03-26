import { getSession, isAdmin } from "@/lib/session";
import { getImpactOverview, getSupplierImpactRecords } from "@/lib/actions/impact";
import { getFacilityProfile, getCertifications, getDppExportData } from "@/lib/actions/facility";
import { prisma } from "@/lib/db";
import { AdminImpactView } from "./admin-impact";
import { SupplierImpactView } from "./supplier-impact";

export default async function ImpactPage() {
  const session = await getSession();

  if (isAdmin(session)) {
    const [overview, dppData, pendingCount] = await Promise.all([
      getImpactOverview(),
      getDppExportData(),
      prisma.supplierImpact.count({ where: { status: "SUBMITTED" } }),
    ]);
    return <AdminImpactView overview={overview} dppData={JSON.parse(JSON.stringify(dppData))} pendingCount={pendingCount} />;
  }

  // Supplier view
  if (!session.supplierId) {
    return (
      <div className="px-6 py-8 max-w-[900px] mx-auto">
        <p className="text-[13px] text-muted-foreground">No supplier linked to your account.</p>
      </div>
    );
  }

  let overview = { totalRecords: 0, byCategory: [] as { category: string; totalValue: number; count: number }[], bySupplier: [] as { supplierId: number; supplierName: string; totalValue: number; count: number }[] };
  let records: { id: number; category: string; value: number; unit: string; dataQuality: string; status: string; scope: string; period: string | null; notes: string | null; createdAt: string; productionRun: { runCode: string } | null }[] = [];

  try {
    overview = await getImpactOverview(session.supplierId);
    const rawRecords = await getSupplierImpactRecords(session.supplierId);
    records = rawRecords.map((r) => ({
      id: r.id,
      category: r.category,
      value: r.value,
      unit: r.unit,
      dataQuality: r.dataQuality,
      status: r.status,
      scope: r.scope,
      period: r.period,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
      productionRun: r.productionRun ? { runCode: r.productionRun.runCode } : null,
    }));
  } catch (error) {
    console.error("Impact page error:", error);
  }

  const [facilityProfile, certifications, runs] = await Promise.all([
    getFacilityProfile(session.supplierId),
    getCertifications(session.supplierId),
    prisma.productionRun.findMany({
      where: { supplierId: session.supplierId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, runCode: true, productName: true, quantity: true },
    }),
  ]);

  return (
    <SupplierImpactView
      overview={overview}
      records={records}
      facilityProfile={facilityProfile ? JSON.parse(JSON.stringify(facilityProfile)) : null}
      certifications={JSON.parse(JSON.stringify(certifications))}
      productionRuns={runs}
      supplierId={session.supplierId}
      supplierName={session.supplierName || "My Facility"}
    />
  );
}
