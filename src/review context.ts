import fs from "fs";
import path from "path";

export function getCodeContext(
  repositoryRoot: string,
  filePath: string,
  lineNumber: number,
  contextLines = 10
): string {
  if (!Number.isInteger(lineNumber) || lineNumber < 1) {
    throw new RangeError("lineNumber must be a positive integer");
  }

  if (!Number.isInteger(contextLines) || contextLines < 0) {
    throw new RangeError("contextLines must be a non-negative integer");
  }

  const absolutePath = path.resolve(repositoryRoot, filePath);

  const lines = fs
    .readFileSync(absolutePath, "utf-8")
    .split(/\r?\n/);

  if (lineNumber > lines.length) {
    throw new RangeError(
      `lineNumber ${lineNumber} is beyond the end of ${filePath}`
    );
  }

  const startLine = Math.max(1, lineNumber - contextLines);
  const endLine = Math.min(lines.length, lineNumber + contextLines);

  const context = lines
  .slice(startLine - 1, endLine)
  .map((code, index) => {
    const currentLine = startLine + index;
    const marker = currentLine === lineNumber ? " <-- CHANGED" : "";

    return `${currentLine} | ${code}${marker}`;
  })
  .join("\n");

return context;
}