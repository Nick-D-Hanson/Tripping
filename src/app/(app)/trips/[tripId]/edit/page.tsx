import { Suspense } from "react";
import { TripForm } from "@/components/trips/trip-form";
import { getTripPageData } from "@/lib/data";
import { canManage } from "@/lib/permissions";

export default function EditTripPage({ params }: { params: Promise<{ tripId: string }> }) {
  return (
    <Suspense fallback={<EditTripFallback />}>
      <EditTripContent params={params} />
    </Suspense>
  );
}

async function EditTripContent({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const { trip, role } = await getTripPageData(tripId);

  if (!canManage(role)) {
    throw new Error("Only trip owners can edit trip details.");
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <TripForm trip={trip} />
    </main>
  );
}

function EditTripFallback() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <p className="text-sm text-muted-foreground">Loading trip details...</p>
    </main>
  );
}
