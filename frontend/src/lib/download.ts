import api from "@/lib/axios";

/**
 * Download a file from an authenticated API endpoint.
 * Uses the shared axios instance so the Bearer token is attached (raw <a href>
 * links would hit the API unauthenticated and 401).
 */
export async function downloadFile(path: string, filename: string) {
  const res = await api.get(path, { responseType: "blob" });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Generate and download a CSV template (header row + one example row) entirely
 * client-side — so users know exactly which columns a bulk import expects. */
export function downloadCsvTemplate(
  filename: string,
  headers: string[],
  exampleRow?: (string | number)[]
) {
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(",")];
  if (exampleRow) lines.push(exampleRow.map(esc).join(","));
  const blob = new Blob([lines.join("\n") + "\n"], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
