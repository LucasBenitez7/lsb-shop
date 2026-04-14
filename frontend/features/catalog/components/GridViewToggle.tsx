import { cn } from "@/lib/utils";

interface GridViewToggleProps {
  currentView: 2 | 4;
  currentMobileView: 1 | 2;
  onViewChange: (view: 2 | 4) => void;
  onMobileViewChange: (view: 1 | 2) => void;
  className?: string;
}

export function GridViewToggle({
  currentView,
  currentMobileView,
  onViewChange,
  onMobileViewChange,
  className,
}: GridViewToggleProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 mr-5 sm:border-r border-neutral-300 pr-4",
        className,
      )}
    >
      {/* 1 Column Icon - SOLO MOBILE (< md) */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        onClick={() => onMobileViewChange(1)}
        aria-label="Vista 1 columna"
        className={cn(
          "size-7 cursor-pointer transition-colors md:hidden",
          currentMobileView === 1
            ? "stroke-foreground"
            : "stroke-neutral-300 hover:stroke-neutral-500",
        )}
      >
        <rect x="4" y="4" width="16" height="16" strokeWidth="1" />
      </svg>

      {/* 2 Columns Icon - MOBILE (< md) */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        onClick={() => onMobileViewChange(2)}
        aria-label="Vista 2 columnas (mobile)"
        className={cn(
          "size-7 cursor-pointer transition-colors md:hidden",
          currentMobileView === 2
            ? "stroke-foreground"
            : "stroke-neutral-300 hover:stroke-neutral-500",
        )}
      >
        <rect x="4" y="4" width="16" height="16" strokeWidth="1" />
        <line x1="12" y1="4" x2="12" y2="20" strokeWidth="1" />
      </svg>

      {/* 2 Columns Icon - DESKTOP (≥ md) */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        onClick={() => onViewChange(2)}
        aria-label="Vista 2 columnas (desktop)"
        className={cn(
          "size-7 cursor-pointer transition-colors hidden md:block",
          currentView === 2
            ? "stroke-foreground"
            : "stroke-neutral-300 hover:stroke-neutral-500",
        )}
      >
        <rect x="4" y="4" width="16" height="16" strokeWidth="1" />
        <line x1="12" y1="4" x2="12" y2="20" strokeWidth="1" />
      </svg>

      {/* 4 Columns Icon - SOLO DESKTOP (≥ md) */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        onClick={() => onViewChange(4)}
        aria-label="Vista 4 columnas"
        className={cn(
          "size-7 cursor-pointer transition-colors hidden md:block",
          currentView === 4
            ? "stroke-foreground"
            : "stroke-neutral-300 hover:stroke-neutral-500",
        )}
      >
        <rect x="4" y="4" width="16" height="16" strokeWidth="1" />
        <line x1="12" y1="4" x2="12" y2="20" strokeWidth="1" />
        <line x1="4" y1="12" x2="20" y2="12" strokeWidth="1" />
      </svg>
    </div>
  );
}
