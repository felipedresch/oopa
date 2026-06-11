import { expect, test } from "vitest";

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, normalizePaginationOpts } from "./pagination";

test("normalizePaginationOpts aplica default 25", () => {
  const normalized = normalizePaginationOpts({ numItems: 0, cursor: null });
  expect(normalized.numItems).toBe(DEFAULT_PAGE_SIZE);
});

test("normalizePaginationOpts limita ao maximo 100", () => {
  const normalized = normalizePaginationOpts({ numItems: 500, cursor: null });
  expect(normalized.numItems).toBe(MAX_PAGE_SIZE);
});
