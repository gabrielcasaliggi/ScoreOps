import { Suspense } from "react";
import { TareasView } from "./tareas-view";

export default function TareasPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
          Cargando tareas...
        </div>
      }
    >
      <TareasView />
    </Suspense>
  );
}
