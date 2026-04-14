import { FaArrowRightLong } from "react-icons/fa6";

import { ProductCarousel } from "@/features/home/components/ProductCarousel";

import { getPublicProducts } from "@/lib/api/products";

export default async function InterestSection() {
  const { rows: products } = await getPublicProducts({
    page: 1,
    limit: 8,
  });

  return (
    <section className="w-full pt-10 pb-20 bg-background">
      <div className="w-full">
        <div className="mb-4 ml-0 sm:ml-8 text-center sm:text-left flex justify-center sm:justify-start items-center">
          <FaArrowRightLong className="mr-2 hidden sm:block sm:size-8" />

          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl font-heading uppercase">
            TE PODRIA INTERESAR
          </h2>
        </div>

        <ProductCarousel products={products} />
      </div>
    </section>
  );
}
