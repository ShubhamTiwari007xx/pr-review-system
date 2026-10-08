import fs from "fs";
import path from "path";

import type {
  Component,
  Relationship,
  RepositoryGraph,
} from "./types";

const SOURCE_EXTENSIONS = [".ts", ".js"];

const IGNORED_DIRECTORIES = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "generated",
];

function getSourceFiles(directory: string): string[] {
  const entries = fs.readdirSync(directory, {
    withFileTypes: true,
  });

  const files: string[] = [];

  for (const entry of entries) {
    if (
      entry.isDirectory() &&
      IGNORED_DIRECTORIES.includes(entry.name)
    ) {
      continue;
    }

    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...getSourceFiles(fullPath));
      continue;
    }

    if (
      entry.isFile() &&
      SOURCE_EXTENSIONS.includes(path.extname(entry.name))
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractImports(content: string): string[] {
  const imports: string[] = [];

  const importRegex =
    /import\s+(?:[\s\S]*?\s+from\s+)?["'](\.[^"']+)["']/g;

  let match;

  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return imports;
}

function resolveImport(
  filePath: string,
  importPath: string
): string | null {
  const directory = path.dirname(filePath);

  const basePath = path.resolve(directory, importPath);

  for (const extension of SOURCE_EXTENSIONS) {
    const candidate = `${basePath}${extension}`;

    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  for (const extension of SOURCE_EXTENSIONS) {
    const candidate = path.join(basePath, `index${extension}`);

    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}



function buildRepositoryGraph(
  rootDirectory: string
): RepositoryGraph {
  const sourceFiles = getSourceFiles(rootDirectory);

  const components: Component[] = [];
  const relationships: Relationship[] = [];

  for (const filePath of sourceFiles) {
    const relativeFile = path
      .relative(rootDirectory, filePath)
      .replace(/\\/g, "/");

    components.push({
      file: relativeFile,
    });

    const content = fs.readFileSync(filePath, "utf-8");

    const imports = extractImports(content);

    for (const importPath of imports) {
      const resolvedPath = resolveImport(
        filePath,
        importPath
      );

      if (!resolvedPath) {
        continue;
      }

      const relativeImportedFile = path
        .relative(rootDirectory, resolvedPath)
        .replace(/\\/g, "/");

      relationships.push({
        from: relativeFile,
        to: relativeImportedFile,
      });
    }
  }

  return {
    components,
    relationships,
  };
}

export { buildRepositoryGraph };