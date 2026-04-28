"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

import type { Category } from "@/types/category";

interface Props {
  categories: Category[];
}

export default function FeaturedGrid({ categories }: Props) {
  return (
    <section className="relative w-full">
      {/* GRID */}
      <div className="grid w-full grid-cols-1 md:grid-cols-2">
        {categories.slice(0, 4).map((cat, index) => {
          const fallback = "/og/default-products.jpg";
          const desktopImageSrc = cat.imageUrl || fallback;
          const mobileImageSrc = cat.mobileImageUrl || desktopImageSrc;

          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="group relative aspect-[4/5] md:aspect-[4/3] w-full overflow-hidden cursor-pointer"
            >
              <Link href={`/cat/${cat.slug}`} className="block size-full">
                <div className="absolute inset-0 size-full">
                  <div className="block md:hidden size-full relative">
                    <Image
                      src={mobileImageSrc}
                      alt={cat.name}
                      fill
                      priority={index < 2}
                      className="object-cover object-top"
                      sizes="(max-width: 767px) 100vw, 1px"
                    />
                  </div>

                  <div className="hidden md:block size-full relative">
                    <Image
                      src={desktopImageSrc}
                      alt={cat.name}
                      fill
                      priority={index < 2}
                      className="object-cover"
                      sizes="(min-width: 768px) 50vw, 1px"
                    />
                  </div>
                  <div className="absolute inset-0" />
                </div>

                <div className="absolute bottom-0 left-0 flex justify-between items-center w-full p-3 space-y-1 text-center text-white z-20">
                  <h3 className="text-xl md:text-2xl font-bold uppercase tracking-wider text-shadow-black">
                    {cat.name}
                  </h3>
                  <span className="underline underline-offset-2 md:opacity-0 md:group-hover:opacity-100 md:group-hover:underline-offset-2 transition-all duration-300 font-medium text-left text-xs md:text-sm">
                    VER TODOS
                  </span>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
