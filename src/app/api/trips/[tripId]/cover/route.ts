import { eq } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { tripCovers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/server";
import { canEdit, getTripRole } from "@/lib/permissions";

type Context = { params: Promise<{ tripId: string }> };
const coverSchema = z.object({
  image: z.string().max(700_000).regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/).nullable(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  zoom: z.number().min(1).max(3),
});

export async function GET(_request: Request, { params }: Context) {
  const user = await getCurrentUser();
  if (!user) return new Response(null, { status: 401 });
  const { tripId } = await params;
  if (!await getTripRole(tripId, user)) return new Response(null, { status: 403 });
  const [cover] = await getDb().select({ image: tripCovers.image }).from(tripCovers).where(eq(tripCovers.tripId, tripId));
  if (!cover) return new Response(null, { status: 404 });
  return new Response(Buffer.from(cover.image.split(",")[1], "base64"), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export async function PUT(request: Request, { params }: Context) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });
  const { tripId } = await params;
  if (!canEdit(await getTripRole(tripId, user))) return Response.json({ error: "Only Owners and Editors can change the trip photo." }, { status: 403 });
  if (Number(request.headers.get("content-length")) > 710_000) return Response.json({ error: "Photo is too large." }, { status: 413 });
  const body = await request.text();
  if (body.length > 710_000) return Response.json({ error: "Photo is too large." }, { status: 413 });
  let value;
  try { value = coverSchema.parse(JSON.parse(body)); }
  catch { return Response.json({ error: "Choose a valid photo and crop." }, { status: 400 }); }
  if (value.image) {
    const bytes = Buffer.from(value.image.split(",")[1], "base64");
    if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255) return Response.json({ error: "Choose a valid JPEG photo." }, { status: 400 });
    const values = { ...value, image: value.image, tripId, updatedAt: new Date() };
    await getDb().insert(tripCovers).values(values).onConflictDoUpdate({ target: tripCovers.tripId, set: values });
  } else {
    await getDb().delete(tripCovers).where(eq(tripCovers.tripId, tripId));
  }
  revalidatePath("/trips");
  return Response.json({ ok: true });
}
