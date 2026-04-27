import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton mostrado enquanto o cardápio público carrega.
 * Mostra estrutura imediatamente (cover, header, categorias, cards) ao invés de spinner em tela cheia.
 */
export const PublicMenuSkeleton = () => (
  <div className="min-h-screen bg-background pb-32">
    {/* Cover */}
    <div className="w-full pt-3 sm:pt-0">
      <Skeleton className="h-44 w-full rounded-t-3xl sm:h-56 sm:rounded-none md:h-72" />
    </div>

    {/* Logo + nome */}
    <div className="container mx-auto -mt-10 px-4 sm:px-6">
      <div className="flex items-end gap-4">
        <Skeleton className="h-20 w-20 rounded-2xl border-4 border-background sm:h-24 sm:w-24" />
        <div className="flex-1 space-y-2 pb-2">
          <Skeleton className="h-6 w-2/3 max-w-xs" />
          <Skeleton className="h-4 w-1/3 max-w-[160px]" />
        </div>
      </div>
    </div>

    {/* Categorias */}
    <div className="container mx-auto mt-6 px-4 sm:px-6">
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-20 shrink-0 rounded-2xl" />
        ))}
      </div>
    </div>

    {/* Produtos */}
    <div className="container mx-auto mt-8 grid gap-4 px-4 pb-12 sm:px-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
          <Skeleton className="h-44 w-full sm:h-56" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-3 h-6 w-24" />
          </div>
        </div>
      ))}
    </div>
  </div>
);
