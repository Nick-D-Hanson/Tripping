"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useContext, useState, useSyncExternalStore } from "react";
import { moveTripPlannerItem } from "@/app/actions";
import { useToast } from "@/components/ui/toast-provider";

export type PlannerDragData =
  | { source: "idea"; id: string; label: string; kind: "housing" | "activity" | "food" }
  | {
      source: "timeline";
      id: string;
      label: string;
      kind: "travel" | "lodging" | "activity" | "food";
      day: string;
      datetime: string;
    };

type PlannerDragContextValue = { enabled: boolean };

const PlannerDragContext = createContext<PlannerDragContextValue>({ enabled: false });
const hydrationSubscribe = () => () => {};
const clientHydrationSnapshot = () => true;
const serverHydrationSnapshot = () => false;

export const plannerDayDropId = (day: string) => `planner-day:${day}`;
export const plannerDayPanelDropId = (day: string) => `planner-day-panel:${day}`;
export const plannerIdeaBucketDropId = "planner-idea-bucket";

export function usePlannerDragEnabled() {
  return useContext(PlannerDragContext).enabled;
}

export function PlannerDragHandle({ label }: { label: string }) {
  return (
    <span className="flex size-11 shrink-0 touch-none items-center justify-center rounded-md text-muted-foreground" aria-hidden="true">
      <GripVertical className="size-5" />
      <span className="sr-only">Drag {label}</span>
    </span>
  );
}

export function TripPlannerDragProvider({
  tripId,
  canEdit,
  children,
}: {
  tripId: string;
  canEdit: boolean;
  children: React.ReactNode;
}) {
  const hydrated = useSyncExternalStore(hydrationSubscribe, clientHydrationSnapshot, serverHydrationSnapshot);
  const router = useRouter();
  const { toast } = useToast();
  const [activeItem, setActiveItem] = useState<PlannerDragData | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveItem(event.active.data.current as PlannerDragData);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveItem(null);
    const item = event.active.data.current as PlannerDragData | undefined;
    const overId = event.over?.id;
    if (!item || typeof overId !== "string") return;

    const target = overId === plannerIdeaBucketDropId
      ? ({ target: "idea-bucket" } as const)
      : overId.startsWith("planner-day:") || overId.startsWith("planner-day-panel:")
        ? (() => {
            const day = overId.slice(overId.indexOf(":") + 1);
            const targetDate = new Date(`${day}T12:00:00`);
            const sourceDate = item.source === "timeline" ? new Date(item.datetime) : targetDate;
            return {
              target: "day" as const,
              day,
              sourceOffsetMinutes: sourceDate.getTimezoneOffset(),
              targetOffsetMinutes: targetDate.getTimezoneOffset(),
            };
          })()
        : null;

    if (!target || (item.source === "idea" && target.target === "idea-bucket")) return;
    if (item.source === "timeline" && target.target === "day" && item.day === target.day) return;

    const result = await moveTripPlannerItem(
      tripId,
      item.source === "idea"
        ? { source: "idea", id: item.id }
        : { source: "timeline", id: item.id, kind: item.kind },
      target,
    );

    if (!result.ok) {
      toast({ variant: "error", title: "Item not moved", description: result.error });
      return;
    }

    toast({
      variant: "success",
      title: target.target === "idea-bucket" ? "Moved to Idea Bucket" : "Timeline updated",
      description: target.target === "day" ? `${item.label} is now scheduled for ${target.day}.` : `${item.label} is saved as an idea.`,
    });
    router.refresh();
  }

  if (!hydrated) {
    return <PlannerDragContext.Provider value={{ enabled: false }}>{children}</PlannerDragContext.Provider>;
  }

  return (
    <PlannerDragContext.Provider value={{ enabled: canEdit }}>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragCancel={() => setActiveItem(null)}
        onDragEnd={handleDragEnd}
      >
        {children}
        <DragOverlay dropAnimation={{ duration: 200, easing: "ease-in-out" }}>
          {activeItem ? (
            <div className="flex max-w-sm items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-medium text-card-foreground shadow-lg">
              <GripVertical className="size-4 text-muted-foreground" />
              <span className="truncate">{activeItem.label}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </PlannerDragContext.Provider>
  );
}
