import AdmZip from "adm-zip";
import fs from "fs";
import os from "os";
import path from "path";

export function extractRepositoryArchive(
  archiveBuffer: Buffer
): string {
  const tempDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "nexus-repo-")
  );

  const zip = new AdmZip(archiveBuffer);

  zip.extractAllTo(tempDirectory, true);

  const entries = fs.readdirSync(tempDirectory);

  if (entries.length === 0) {
    throw new Error(
      "Extracted repository directory is empty"
    );
  }

  return tempDirectory;

}

export function getRepositoryRoot(
  extractedPath: string
): string {
  const entries = fs
    .readdirSync(extractedPath, {
      withFileTypes: true,
    })
    .filter(
      (entry) =>
        entry.name !== "." &&
        entry.name !== ".."
    );

  if (entries.length === 1 && entries[0].isDirectory()) {
    return path.join(
      extractedPath,
      entries[0].name
    );
  }

  return extractedPath;
}

