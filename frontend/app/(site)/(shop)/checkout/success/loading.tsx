import { Container } from "@/components/ui";

export default function CheckoutSuccessLoading() {
  return (
    <Container className="mt-4 max-w-4xl px-4 py-4">
      <div className="mb-4 flex flex-col gap-2">
        <div className="h-7 w-64 rounded bg-neutral-200 animate-pulse" />
        <div className="h-4 w-72 rounded bg-neutral-200 animate-pulse" />
      </div>

      <div className="mb-4 rounded-xs border bg-card p-4">
        <div className="h-4 w-56 rounded bg-neutral-200 animate-pulse" />
        <div className="mt-2 h-3 w-64 rounded bg-neutral-200 animate-pulse" />
      </div>

      <section className="space-y-4 rounded-xs border bg-card p-4 sm:p-6">
        <div className="h-5 w-40 rounded bg-neutral-200 animate-pulse" />

        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-1">
            <div className="space-y-1">
              <div className="h-4 w-40 rounded bg-neutral-200 animate-pulse" />
              <div className="h-3 w-24 rounded bg-neutral-200 animate-pulse" />
            </div>
            <div className="h-4 w-16 rounded bg-neutral-200 animate-pulse" />
          </div>
        ))}

        <div className="h-px w-full bg-border" />

        <div className="flex items-center justify-between text-sm font-semibold">
          <div className="h-4 w-24 rounded bg-neutral-200 animate-pulse" />
          <div className="h-4 w-20 rounded bg-neutral-200 animate-pulse" />
        </div>
      </section>
    </Container>
  );
}
