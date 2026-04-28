import type { ImageLoaderProps } from "next/image";

export default function imageLoader({ src, width, quality }: ImageLoaderProps) {
  if (src.includes("res.cloudinary.com")) {
    const params = [
      "f_auto",
      "c_limit",
      `w_${width}`,
      `q_${quality || "auto"}`,
    ];
    const [base, file] = src.split("/upload/");
    if (file) {
      return `${base}/upload/${params.join(",")}/${file}`;
    }
  }

  return src;
}
