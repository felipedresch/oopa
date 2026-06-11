import type { PaginationOptions } from "convex/server";

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export function normalizePaginationOpts(
  paginationOpts: PaginationOptions,
): PaginationOptions {
  const numItems = Math.min(
    Math.max(1, paginationOpts.numItems || DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE,
  );

  return {
    ...paginationOpts,
    numItems,
  };
}
