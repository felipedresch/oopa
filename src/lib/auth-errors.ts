export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const data = (error as Error & { data?: { message?: string; code?: string } }).data;
    if (data?.message) {
      return data.message;
    }
    return error.message || fallback;
  }
  return fallback;
}
