"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

const SidebarCloseContext = createContext<(() => void) | undefined>(
  undefined,
);

export function SidebarCloseProvider({
  children,
  onCloseAction,
}: {
  children: ReactNode;
  /**
   * Name satisfies Next.js client-boundary lint (TS71007). This is a normal
   * client callback from Header — not a React Server Action.
   */
  onCloseAction: () => void;
}) {
  return (
    <SidebarCloseContext.Provider value={onCloseAction}>
      {children}
    </SidebarCloseContext.Provider>
  );
}

/** Run after a nav link is chosen inside the mobile sidebar (e.g. close sheet). */
export function useSidebarClose(): () => void {
  return useContext(SidebarCloseContext) ?? (() => {});
}
