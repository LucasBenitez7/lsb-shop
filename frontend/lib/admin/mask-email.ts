/**
 * Enmascara un correo para vistas demo (p. ej. juan@gmail.com → j***@***.com).
 */
export function maskEmailForDemo(email: string | null | undefined): string {
  if (!email?.trim()) return "—";
  const normalized = email.trim().toLowerCase();
  const at = normalized.indexOf("@");
  if (at <= 0) return "***";
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  if (!domain) return "***";
  const first = local[0] ?? "*";
  const domainParts = domain.split(".");
  const tld = domainParts.length > 0 ? domainParts[domainParts.length - 1] : "";
  if (!tld) return `${first}***@***`;
  return `${first}***@***.${tld}`;
}
