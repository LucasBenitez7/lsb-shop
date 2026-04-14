import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function useCloseOnNav(closeFn: () => void) {
  const pathname = usePathname();

  useEffect(() => {
    closeFn();
  }, [pathname, closeFn]);
}
