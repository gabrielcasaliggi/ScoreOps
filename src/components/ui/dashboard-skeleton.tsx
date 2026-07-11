import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return <div className={cn("skeleton-bone rounded-xl", className)} />;
}

export function DashboardSkeleton({
  stats = 4,
  panels = 2,
}: {
  stats?: number;
  panels?: number;
}) {
  return (
    <div className="space-y-6 animate-page-enter" aria-busy aria-label="Cargando tablero">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Bone className="h-3 w-24" />
          <Bone className="h-8 w-56" />
          <Bone className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-9 w-28" />
          <Bone className="h-9 w-24" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: stats }).map((_, i) => (
          <div key={i} className="glass-card rounded-2xl p-5 ring-1 ring-slate-500/10">
            <Bone className="h-3 w-20" />
            <Bone className="mt-3 h-9 w-24" />
            <Bone className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>

      <div className={cn("grid gap-6", panels > 1 ? "lg:grid-cols-2" : "")}>
        {Array.from({ length: panels }).map((_, i) => (
          <div key={i} className="glass-card rounded-2xl p-5 ring-1 ring-slate-500/10">
            <Bone className="h-4 w-40" />
            <Bone className="mt-2 h-3 w-56 max-w-full" />
            <div className="mt-6 space-y-3">
              <Bone className="h-12 w-full" />
              <Bone className="h-12 w-full" />
              <Bone className="h-12 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
