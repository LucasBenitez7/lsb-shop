"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FaHeart, FaRegHeart } from "react-icons/fa6";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { toggleFavoriteAction } from "@/lib/favorites/actions";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  productId: string;
  initialIsFavorite: boolean;
  className?: string;
  iconSize?: string;
  onToggle?: (isFavorite: boolean) => void;
}

export function FavoriteButton({
  productId,
  initialIsFavorite,
  className,
  iconSize,
  onToggle,
}: FavoriteButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const newState = !isFavorite;

    setIsFavorite(newState);

    if (onToggle) onToggle(newState);

    startTransition(async () => {
      const res = await toggleFavoriteAction(productId);

      if (res.error) {
        setIsFavorite(!newState);
        if (onToggle) onToggle(!newState);

        if (res.error.includes("iniciar sesión")) {
          toast.error("Inicia sesión para guardar favoritos", {
            action: {
              label: "Login",
              onClick: () => router.push("/auth/login"),
            },
          });
        } else {
          toast.error(res.error);
        }
      } else if (res.isFavorite !== undefined) {
        setIsFavorite(res.isFavorite);
        if (onToggle) onToggle(res.isFavorite);

        if (res.isFavorite) {
          toast.success("Añadido a favoritos");
        } else {
          toast.success("Eliminado de favoritos");
        }
      }
    });
  };

  return (
    <Button
      variant="ghost"
      className={cn("p-0 h-auto w-auto hover:bg-transparent", className)}
      onClick={handleToggle}
      disabled={isPending}
      aria-label={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
    >
      {isFavorite ? (
        <FaHeart
          className={cn(
            "text-foreground transition-all animate-in zoom-in-50 size-4",
            iconSize,
          )}
        />
      ) : (
        <FaRegHeart
          className={cn("text-foreground transition-colors size-4", iconSize)}
        />
      )}
    </Button>
  );
}
