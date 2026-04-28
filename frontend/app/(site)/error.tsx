"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const router = useRouter();

  return (
    <section className="mx-auto max-w-5xl px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">Algo salió mal</h1>
      <p className="mt-4 text-neutral-600">Intenta nuevamente</p>
      <p className="text-neutral-600">
        Si el problema persiste, vuelve más tarde.
      </p>
      <div className="mt-6">
        <button
          type="button"
          onClick={() => {
            reset();
            router.refresh();
          }}
          className="hover:cursor-pointer py-2 px-4 font-medium rounded-xs border border-slate-300 bg-background hover:bg-neutral-100"
        >
          Reintentar
        </button>
      </div>
    </section>
  );
}
