import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <section className="space-y-6">
      <nav className="text-sm text-neutral-500" aria-label="Breadcrumb">
        <Skeleton className="h-4 w-48" />
      </nav>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <Skeleton className="aspect-[4/5] w-full" />
          <div className="mt-3 grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i: number) => (
              <Skeleton key={i} className="aspect-[4/5] w-full" />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-5 w-32" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i: number) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
          <div className="pt-2 flex items-center gap-2">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-56" />
          </div>
        </div>
      </div>
    </section>
  );
}
