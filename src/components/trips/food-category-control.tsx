import { Coffee, UtensilsCrossed } from "lucide-react";
import { Field, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export function FoodCategoryControl({ defaultValue = "meal" }: { defaultValue?: "meal" | "coffee" }) {
  return (
    <Field>
      <FieldLabel required>Food type</FieldLabel>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="radiogroup" aria-label="Food type">
        {([
          { value: "meal" as const, label: "Meal", icon: UtensilsCrossed },
          { value: "coffee" as const, label: "Coffee", icon: Coffee },
        ]).map((option) => {
          const Icon = option.icon;
          return (
            <label key={option.value} className="relative cursor-pointer">
              <input className="peer sr-only" type="radio" name="category" value={option.value} defaultChecked={defaultValue === option.value} />
              <span className={cn("flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-muted-foreground transition-colors", "peer-checked:bg-card peer-checked:text-primary peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-ring")}> 
                <Icon className="size-4" /> {option.label}
              </span>
            </label>
          );
        })}
      </div>
    </Field>
  );
}
