"use client";

import { cn } from "@/lib/utils";

import {
  SidebarNavLink,
  type SidebarNavLinkClickAction,
  useSidebarNavLinkHandler,
} from "./nav";

import type { CategoryLink } from "@/types/category";

function CategoryBranch({
  node,
  pathname,
  onLinkClickAction,
}: {
  node: CategoryLink;
  pathname: string;
  onLinkClickAction: SidebarNavLinkClickAction;
}) {
  const categoryPath = `/cat/${node.slug}`;

  return (
    <li>
      <SidebarNavLink
        href={categoryPath}
        pathname={pathname}
        onLinkClickAction={onLinkClickAction}
      >
        {node.label}
      </SidebarNavLink>
      {node.children && node.children.length > 0 ? (
        <ul
          className={cn(
            "mt-1 space-y-2",
            "ml-3 border-l border-neutral-200 pl-3",
          )}
        >
          {node.children.map((child) => (
            <CategoryBranch
              key={child.slug}
              node={child}
              pathname={pathname}
              onLinkClickAction={onLinkClickAction}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function SidebarCategoryList({
  categories,
  pathname,
  onLinkClickAction,
}: {
  categories: CategoryLink[];
  pathname: string;
  onLinkClickAction: SidebarNavLinkClickAction;
}) {
  return (
    <ul className="h-full text-base space-y-2">
      <li key="all">
        <SidebarNavLink
          href="/catalogo"
          pathname={pathname}
          onLinkClickAction={onLinkClickAction}
        >
          Todas las prendas
        </SidebarNavLink>
      </li>

      {categories.map((c) => (
        <CategoryBranch
          key={c.slug}
          node={c}
          pathname={pathname}
          onLinkClickAction={onLinkClickAction}
        />
      ))}
    </ul>
  );
}

export function SiteSidebar({
  categories,
  maxDiscount,
}: {
  categories: CategoryLink[];
  maxDiscount: number;
}) {
  const { pathname, handleLinkClick } = useSidebarNavLinkHandler();

  return (
    <aside>
      <div className="px-6 flex flex-col mt-4">
        <div className="flex flex-col pb-4 mb-4 space-y-2 border-b border-neutral-300">
          <SidebarNavLink
            href="/rebajas"
            pathname={pathname}
            onLinkClickAction={handleLinkClick}
            className="w-max text-2xl font-semibold pt-1 text-red-600"
          >
            Rebajas {maxDiscount > 0 && `-${maxDiscount}%`}
          </SidebarNavLink>

          <SidebarNavLink
            href="/novedades"
            pathname={pathname}
            onLinkClickAction={handleLinkClick}
            className="w-max text-2xl font-semibold pt-1"
          >
            Novedades
          </SidebarNavLink>
        </div>

        <SidebarCategoryList
          categories={categories}
          pathname={pathname}
          onLinkClickAction={handleLinkClick}
        />
      </div>
    </aside>
  );
}
