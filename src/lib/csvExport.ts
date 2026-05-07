export function downloadCSV(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const csv = [
    headers.join(";"),
    ...rows.map((r) => r.map((v) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return s.includes(";") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(";")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
