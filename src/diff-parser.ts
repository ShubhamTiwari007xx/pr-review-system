export type ChangedLine = {
  line: number;
  code: string;
};

export type ChangedFile = {
  file: string;
  changedLines: ChangedLine[];
};

export function parseDiff(diff: string): ChangedFile[] {
  const lines = diff.split("\n");

  const files: ChangedFile[] = [];

  let currentFile: ChangedFile | null = null;
  let currentLine = 0;

  for (const line of lines) {
    // New file
    if (line.startsWith("+++ b/")) {
      const file = line.slice(6);

      currentFile = {
        file,
        changedLines: [],
      };

      files.push(currentFile);
      continue;
    }

    // New hunk
    if (line.startsWith("@@")) {
      const match = line.match(
        /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/
      );

      if (!match) {
        continue;
      }

      currentLine = Number(match[1]);
      continue;
    }

    // Ignore everything until we have a file
    if (!currentFile) {
      continue;
    }

    // Added line
    if (line.startsWith("+") && !line.startsWith("+++")) {
      currentFile.changedLines.push({
        line: currentLine,
        code: line.slice(1),
      });

      currentLine++;
      continue;
    }

    // Deleted line
    if (line.startsWith("-") && !line.startsWith("---")) {
      continue;
    }

    // Context line
    currentLine++;
  }

  return files;
}