// Human-mode rendering only. Machine mode never goes through here - it emits
// the full JSON envelope and lets the reader (agent) filter.

export function printKeyValue(obj) {
  const width = Math.max(...Object.keys(obj).map((k) => k.length));
  for (const [k, v] of Object.entries(obj)) {
    console.log(`${k.padEnd(width)}  ${formatValue(v)}`);
  }
}

export function printTable(rows, columns) {
  if (!rows.length) {
    console.log("(no results)");
    return;
  }
  const widths = columns.map((c) =>
    Math.max(c.length, ...rows.map((r) => formatValue(r[c]).length))
  );
  const header = columns.map((c, i) => c.padEnd(widths[i])).join("  ");
  console.log(header);
  console.log(columns.map((_, i) => "-".repeat(widths[i])).join("  "));
  for (const row of rows) {
    console.log(columns.map((c, i) => formatValue(row[c]).padEnd(widths[i])).join("  "));
  }
}

export function printDryRun(wouldSend) {
  console.log("[dry-run] no request was sent. Would send:\n");
  console.log(JSON.stringify(wouldSend, null, 2));
}

function formatValue(v) {
  if (v === undefined || v === null) return "-";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
