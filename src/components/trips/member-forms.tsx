"use client";

import { UserPlus } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMember, updateMemberRole } from "@/app/actions";
import { actionErrorMessage } from "@/components/trips/mutation-feedback";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast-provider";

export function InviteMemberForm({ tripId }: { tripId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);

  const action = async (formData: FormData) => {
    setError(null);

    try {
      const result = await addMember(tripId, formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      formRef.current?.reset();
      router.refresh();
      toast({
        variant: "success",
        title: "Collaborator invited",
        description: "The trip member list has been updated.",
      });
    } catch (error) {
      setError(actionErrorMessage(error));
    }
  };

  return (
    <form ref={formRef} action={action} className="grid gap-4 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
      {error ? (
        <Notice variant="error" className="sm:col-span-3">
          {error}
        </Notice>
      ) : null}
      <Field>
        <FieldLabel required>Email</FieldLabel>
        <Input name="email" type="email" placeholder="friend@example.com" required />
      </Field>
      <Field>
        <FieldLabel required>Role</FieldLabel>
        <Select name="role" defaultValue="editor">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="editor">editor</SelectItem>
            <SelectItem value="viewer">viewer</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <SubmitButton className="w-full sm:w-auto" pendingText="Adding">
        <UserPlus className="size-4" />
        Add
      </SubmitButton>
    </form>
  );
}

export function MemberRoleForm({
  tripId,
  memberId,
  defaultRole,
}: {
  tripId: string;
  memberId: string;
  defaultRole: "editor" | "viewer";
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="grid gap-2">
      {error ? <Notice variant="error">{error}</Notice> : null}
      <form
        action={(formData) =>
          startTransition(async () => {
            setError(null);

            try {
              const result = await updateMemberRole(tripId, memberId, formData);
              if (!result.ok) {
                setError(result.error);
                return;
              }

              router.refresh();
              toast({
                variant: "success",
                title: "Role updated",
                description: "Trip member permissions were saved.",
              });
            } catch (error) {
              setError(actionErrorMessage(error));
            }
          })
        }
        className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
      >
        <Select name="role" defaultValue={defaultRole}>
          <SelectTrigger className="w-full sm:w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="editor">editor</SelectItem>
            <SelectItem value="viewer">viewer</SelectItem>
          </SelectContent>
        </Select>
        <SubmitButton variant="secondary" size="sm" className="w-full sm:w-auto" pendingText={isPending ? "Saving" : undefined}>
          Save
        </SubmitButton>
      </form>
    </div>
  );
}
