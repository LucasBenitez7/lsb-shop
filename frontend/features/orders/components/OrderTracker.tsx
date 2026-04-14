import type { FulfillmentStatus } from "@/types/enums";
import { FaBox, FaTruckFast, FaCheck } from "react-icons/fa6";

import { cn } from "@/lib/utils";

const STEPS = [
  { id: "PREPARING", label: "Preparando", icon: FaBox },
  { id: "SHIPPED", label: "Enviado", icon: FaTruckFast },
  { id: "DELIVERED", label: "Entregado", icon: FaCheck },
];

const STATUS_TO_STEP_INDEX: Record<string, number> = {
  UNFULFILLED: -1,
  PREPARING: 0,
  READY_FOR_PICKUP: 1,
  SHIPPED: 1,
  DELIVERED: 2,
  RETURNED: 2,
};

export function OrderTracker({ status }: { status: FulfillmentStatus }) {
  const currentStepIndex = STATUS_TO_STEP_INDEX[status] ?? -1;
  const progressPercentage = Math.min(100, Math.max(0, currentStepIndex * 50));

  return (
    <div className="w-full pt-6 pb-10 px-6 sm:px-8">
      <div className="relative flex items-center justify-between">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-neutral-200 -translate-y-1/2 rounded-full" />

        <div
          className="absolute top-1/2 left-0 h-1 bg-foreground -translate-y-1/2 transition-all duration-700 ease-out rounded-full"
          style={{ width: `${progressPercentage}%` }}
        />

        {STEPS.map((step, index) => {
          const isCompleted = index <= currentStepIndex;
          const isCurrent = index === currentStepIndex;

          let labelAlignClass = "text-center -translate-x-1/2 left-1/2";

          if (index === 0)
            labelAlignClass =
              "text-center -translate-x-1/2 left-1/2 origin-left";

          return (
            <div
              key={step.id}
              className="relative z-10 flex flex-col items-center group"
            >
              <div
                className={cn(
                  "size-8 sm:size-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 bg-white",
                  isCompleted
                    ? "bg-foreground border-foreground text-white shadow-md scale-110"
                    : "border-neutral-300 text-neutral-300",
                )}
              >
                <step.icon className="size-3.5 sm:size-4" />
              </div>

              <span
                className={cn(
                  "absolute top-10 sm:top-12 w-24 text-[10px] sm:text-xs font-bold uppercase tracking-wide transition-colors duration-500",
                  labelAlignClass,
                  isCompleted ? "text-foreground" : "text-neutral-400",
                  isCurrent && "scale-105",
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
