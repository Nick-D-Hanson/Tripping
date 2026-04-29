import { TripForm } from "@/components/trips/trip-form";
import { getTripPageData } from "@/lib/data";
import { canManage } from "@/lib/permissions";

export default async function EditTripPage({ params }: { params: Promise<{ tripId: string }> }) {
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
