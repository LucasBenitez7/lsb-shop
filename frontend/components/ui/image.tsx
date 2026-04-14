"use client";

import NextImage, { type ImageProps } from "next/image";

import globalLoader from "@/lib/image-loader";

export function Image(props: ImageProps) {
  return <NextImage {...props} loader={globalLoader} />;
}
