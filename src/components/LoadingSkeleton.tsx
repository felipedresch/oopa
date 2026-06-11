import { Skeleton } from "@/components/ui/skeleton";

type LoadingSkeletonProps = {
  rows?: number;
};

export function LoadingSkeleton({ rows = 3 }: LoadingSkeletonProps) {
  return (
    <div aria-busy="true" className="flex flex-col gap-3" role="status">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton className="h-20 w-full rounded-xl" key={index} />
      ))}
      <span className="sr-only">Carregando...</span>
    </div>
  );
}
