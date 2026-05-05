import { Suspense } from "react";
import { ArrowLeft, Crown, Mail, Shield } from "lucide-react";
import Link from "next/link";
import { DeleteButton } from "@/components/trips/delete-button";
import { InviteMemberForm, MemberRoleForm } from "@/components/trips/member-forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EntityRow, EntityRowActions, EntityRowBody, EntityRowHeader, EntityRowMeta, EntityRowTitle } from "@/components/ui/entity-row";
import { PageHeaderSkeleton, SectionCardSkeleton } from "@/components/ui/loading-state";
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
            <InviteMemberForm tripId={trip.id} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Trip members</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {members.map((member) => (
            <EntityRow key={member.id}>
              <EntityRowHeader className="sm:items-center">
                <EntityRowBody>
                  <EntityRowTitle>
                  {member.role === "owner" ? <Crown className="size-4 text-accent" /> : <Shield className="size-4 text-muted-foreground" />}
                  <p className="font-medium">{member.email ?? member.userId}</p>
                  <Badge variant={member.role === "owner" ? "default" : "secondary"}>{member.role}</Badge>
                  </EntityRowTitle>
                  <EntityRowMeta className="mt-1 flex items-center gap-1">
                    <Mail className="size-3.5" />
                    {member.userId ? "Active account" : "Pending invite"}
                  </EntityRowMeta>
                </EntityRowBody>
                {manageable && member.role !== "owner" ? (
                  <EntityRowActions className="w-full sm:w-auto">
                    <MemberRoleForm tripId={trip.id} memberId={member.id} defaultRole={member.role} />
                    <DeleteButton kind="member" tripId={trip.id} id={member.id} className="w-full justify-center sm:w-auto" />
                  </EntityRowActions>
                ) : null}
              </EntityRowHeader>
            </EntityRow>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}

function MembersPageFallback() {
  return (
    <main className="mx-auto grid w-full max-w-4xl gap-6 px-4 py-8 sm:px-6">
      <PageHeaderSkeleton />
      <SectionCardSkeleton lines={2} />
      <SectionCardSkeleton lines={4} />
    </main>
  );
}
