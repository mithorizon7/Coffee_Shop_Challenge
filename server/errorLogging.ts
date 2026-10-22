export function logError(context: string, error: unknown): void {
  // Driver/parser errors can contain connection details or request bodies.
  // Keep diagnostics useful without copying those values into hosted logs.
  const type =
    error instanceof SyntaxError
      ? "SyntaxError"
      : error instanceof TypeError
        ? "TypeError"
        : error instanceof Error
          ? "Error"
          : "UnknownError";
  console.error(context, { type });
}
