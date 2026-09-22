/** Quote one argument for POSIX shells used by Eve sandboxes. */
export function shellQuote(value: string): string {
  if (value.length === 0) return "''";
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

export function shellArgs(values: readonly string[]): string {
  return values.map(shellQuote).join(" ");
}
