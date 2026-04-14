const SKELETONS = 12;

export default function LoadingCatalogo() {
  return (
    <section>
      <div className="my-6 grid gap-x-1 gap-y-10 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: SKELETONS }).map((_, i) => (
          <div key={i} className="overflow-hidden">
            <div className="aspect-[3/4] bg-neutral-100 animate-pulse" />
            <div className="px-2 py-2">
              <div className="h-4 w-3/4 rounded bg-neutral-200 animate-pulse" />
              <div className="mt-2 h-3 w-1/3 rounded bg-neutral-200 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
