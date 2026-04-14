import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingPublic() {
  return (
    <div className="w-full space-y-0">
      {/* HERO PLACEHOLDER */}
      <Skeleton className="h-[95vh] w-full rounded-none bg-neutral-200 dark:bg-neutral-800" />

      {/* FEATURED GRID PLACEHOLDER */}
      <div className="grid w-full grid-cols-1 md:grid-cols-2 gap-px bg-background">
        <Skeleton className="h-[90vh] w-full rounded-none bg-neutral-100 dark:bg-neutral-900" />
        <Skeleton className="h-[90vh] w-full rounded-none bg-neutral-100 dark:bg-neutral-900" />
        <Skeleton className="hidden h-[90vh] w-full rounded-none bg-neutral-100 dark:bg-neutral-900 md:block" />
        <Skeleton className="hidden h-[90vh] w-full rounded-none bg-neutral-100 dark:bg-neutral-900 md:block" />
      </div>
    </div>
  );
}
