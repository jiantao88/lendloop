export function errorText(error: unknown): string {
  if (typeof error === "object" && error && "data" in error) {
    const data = (error as { data?: unknown }).data;
    if (typeof data === "string") return data;
  }
  if (error instanceof Error) {
    const matched = error.message.match(/Uncaught ConvexError:\s*(.+)/);
    if (matched) return matched[1].split("\n")[0];
    return error.message;
  }
  return "Something went wrong";
}
