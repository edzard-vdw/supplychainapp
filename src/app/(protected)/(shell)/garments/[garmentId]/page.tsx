import { notFound } from "next/navigation";
import { getGarment } from "@/lib/actions/garments";
import { GarmentDetailClient } from "./garment-detail-client";

export default async function GarmentDetailPage({ params }: { params: Promise<{ garmentId: string }> }) {
  const { garmentId } = await params;
  const id = parseInt(garmentId);
  if (isNaN(id)) notFound();

  const garment = await getGarment(id);
  if (!garment) notFound();

  return <GarmentDetailClient garment={JSON.parse(JSON.stringify(garment))} />;
}
