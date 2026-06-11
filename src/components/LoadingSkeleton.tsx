import { Skeleton } from "@/components/ui/skeleton";

type LoadingSkeletonProps = {
  rows?: number;
};

export function LoadingSkeleton({ rows = 3 }: LoadingSkeletonProps) {
  return (
    <div aria-busy="true" className="flex flex-col gap-3" role="status">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton className="h-16 w-full" key={index} />
      ))}
      <span className="sr-only">Carregando...</span>
    </div>
  );
}
