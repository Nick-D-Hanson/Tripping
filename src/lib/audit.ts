import { getDb } from "@/db";
import { auditLogs, type AuditLogAction } from "@/db/schema";

type AuditEventInput = {
  tripId?: string | null;
  actorUserId: string;
  action: AuditLogAction;
  targetType: string;
  targetId?: string | null;
  requestId?: string | null;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
};

export async function recordAuditEvent({
  tripId = null,
  actorUserId,
  action,
  targetType,
  targetId = null,
  requestId = null,
  ipAddress = null,
  metadata = {},
}: AuditEventInput) {
  await getDb().insert(auditLogs).values({
    tripId,
    actorUserId,
    action,
    targetType,
    targetId,
    requestId,
    ipAddress,
    metadata,
  });
}
