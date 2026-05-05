import { Suspense } from "react";
import { ArrowLeft, Crown, Mail, Shield, UserPlus } from "lucide-react";
import Link from "next/link";
import { addMember, updateMemberRole } from "@/app/actions";
import { DeleteButton } from "@/components/trips/delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTripMembersPageData } from "@/lib/data";
import { canManage } from "@/lib/permissions";

export default function MembersPage({ params }: { params: Promise<{ tripId: string }> }) {
  return (
    <Suspense fallback={<MembersPageFallback />}>
      <MembersPageContent params={params} />
    </Suspense>
  );
}

async function MembersPageContent({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const { trip, members, role } = await getTripMembersPageData(tripId);
  const manageable = canManage(role);

  return (
    <main className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-8 sm:px-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3">
          <Link href={`/trips/${trip.id}`}>
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </Button>
        <h1 className="text-3xl font-semibold tracking-normal">Collaborators</h1>
        <p className="mt-2 text-muted-foreground">{trip.name}</p>
      </div>

      {manageable ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite traveler</CardTitle>
            <CardDescription>Invite by email. The invite is claimed when that user signs in with the same email.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={addMember.bind(null, trip.id)} className="grid gap-4 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input name="email" type="email" placeholder="friend@example.com" required />
              </div>
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select name="role" defaultValue="editor">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="editor">editor</SelectItem>
                    <SelectItem value="viewer">viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full sm:w-auto">
                <UserPlus className="size-4" />
                Add
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Trip members</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {members.map((member) => (
            <div key={member.id} className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {member.role === "owner" ? <Crown className="size-4 text-accent" /> : <Shield className="size-4 text-muted-foreground" />}
                  <p className="font-medium">{member.email ?? member.userId}</p>
                  <Badge variant={member.role === "owner" ? "default" : "secondary"}>{member.role}</Badge>
                </div>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <Mail className="size-3.5" />
                  {member.userId ? "Active account" : "Pending invite"}
                </p>
              </div>
              {manageable && member.role !== "owner" ? (
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                  <form action={updateMemberRole.bind(null, trip.id, member.id)} className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                    <Select name="role" defaultValue={member.role}>
                      <SelectTrigger className="w-full sm:w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">editor</SelectItem>
                        <SelectItem value="viewer">viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="submit" variant="outline" size="sm" className="w-full sm:w-auto">Save</Button>
                  </form>
                  <DeleteButton kind="member" tripId={trip.id} id={member.id} className="w-full justify-center sm:w-auto" />
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}

function MembersPageFallback() {
  return (
    <main className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-8 sm:px-6">
      <Card>
        <CardContent className="pt-5 text-sm text-muted-foreground">Loading collaborators...</CardContent>
      </Card>
    </main>
  );
}
