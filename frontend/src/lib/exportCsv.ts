/**
 * exportCsv.ts
 * 
 * A reusable utility to convert in-memory JavaScript data into a CSV file
 * and trigger a browser download — no server round-trip needed.
 *
 * Usage:
 *   exportCsv("my-report.csv", ["Name", "Hours"], [["Alice", "40"], ["Bob", "35"]]);
 */

/**
 * Escapes a single cell value for CSV safety.
 *
 * CSV has a specific rule: if a cell contains a comma, a double-quote,
 * or a newline character, the entire cell must be wrapped in double-quotes.
 * Additionally, any double-quotes inside the cell must be doubled ("").
 *
 * Examples:
 *   "Hello"       → Hello          (no special chars, untouched)
 *   "Hello, World" → "Hello, World" (contains comma, gets wrapped)
 *   'He said "hi"' → "He said ""hi""" (quotes inside, doubled + wrapped)
 */
function escapeCsvCell(value: string): string {
  // If the cell contains any of these dangerous characters, we must wrap it
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    // Step 1: Double every existing quote  →  " becomes ""
    // Step 2: Wrap the entire thing in quotes
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Main export function.
 *
 * @param filename  - The name of the downloaded file (e.g., "report.csv")
 * @param headers   - Column header names (e.g., ["Project", "Hours"])
 * @param rows      - 2D array of string values, one sub-array per row
 *
 * How it works internally:
 * 1. Takes the headers array and joins them with commas → "Project,Hours"
 * 2. Takes each row array and joins them with commas   → "PRJ-001,120.50"
 * 3. Joins all lines with newline characters (\n)
 * 4. Creates a Blob (a browser-native binary data container) from the CSV string
 * 5. Creates a temporary invisible <a> link pointing to the Blob
 * 6. Programmatically "clicks" it to trigger the browser's Save dialog
 * 7. Cleans up by revoking the temporary URL to free memory
 */
export function exportCsv(
  filename: string,
  headers: string[],
  rows: string[][]
): void {
  // Build the header row (first line of the CSV)
  const headerLine = headers.map(escapeCsvCell).join(",");

  // Build each data row
  const dataLines = rows.map((row) => row.map(escapeCsvCell).join(","));

  // Combine everything: header on top, then all data rows, separated by newlines
  const csvContent = [headerLine, ...dataLines].join("\n");

  // --- Browser Download Trick ---
  // A "Blob" is like an in-memory file. We tell the browser it's a CSV file.
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  // Create a temporary URL that points to our in-memory Blob
  const url = URL.createObjectURL(blob);

  // Create a hidden <a> element, set its href to our Blob URL,
  // and set the "download" attribute to our desired filename
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  // Append it to the page (required by Firefox), click it, then remove it
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Free the memory used by the temporary Blob URL
  URL.revokeObjectURL(url);
}
