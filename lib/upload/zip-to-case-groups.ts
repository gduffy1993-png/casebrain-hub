import JSZip from "jszip";

export type ZipCaseGroup = { caseTitle: string; files: File[] };

function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\/+/, "");
}

function mimeForName(name: string): string {
  const l = name.toLowerCase();
  if (l.endsWith(".pdf")) return "application/pdf";
  if (l.endsWith(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (l.endsWith(".txt")) return "text/plain";
  return "application/octet-stream";
}

function isAcceptedDoc(name: string): boolean {
  const l = name.toLowerCase();
  return l.endsWith(".pdf") || l.endsWith(".docx") || l.endsWith(".txt");
}

/**
 * Each immediate subfolder under the zip root becomes one case.
 * Files placed at the root of the zip are grouped under "(root)".
 * If multiple zip files are passed, folder keys are prefixed with the zip stem to avoid collisions.
 */
export async function expandZipsToFolderCaseGroups(
  zipFiles: File[],
  titlePrefix: string,
): Promise<ZipCaseGroup[]> {
  if (!zipFiles.length) return [];

  const multiZip = zipFiles.length > 1;
  const prefix = titlePrefix.trim() || "Import";

  /** folderKey -> list of { entryName, buffer } */
  const bucket = new Map<string, { entryName: string; buffer: Buffer }[]>();

  for (const zipFile of zipFiles) {
    const zipStem = zipFile.name.replace(/\.zip$/i, "").trim() || "archive";
    const buf = Buffer.from(await zipFile.arrayBuffer());
    const zip = await JSZip.loadAsync(buf);

    for (const relPath of Object.keys(zip.files)) {
      const entry = zip.files[relPath];
      if (!entry || entry.dir) continue;

      const path = normalizePath(relPath);
      if (!path || path.includes("__MACOSX/") || path.endsWith(".DS_Store")) continue;
      if (!isAcceptedDoc(path)) continue;

      const segments = path.split("/").filter(Boolean);
      if (segments.length === 0) continue;

      let folderKey: string;
      let entryName: string;

      if (segments.length === 1) {
        folderKey = "(root)";
        entryName = segments[0]!;
      } else {
        folderKey = segments[0]!;
        entryName = segments.slice(1).join("/");
      }

      if (multiZip) {
        folderKey = `${zipStem}/${folderKey}`;
      }

      const data = (await entry.async("uint8array")) as Uint8Array;
      const buffer = Buffer.from(data);
      const list = bucket.get(folderKey) ?? [];
      list.push({ entryName: entryName || path.split("/").pop()!, buffer });
      bucket.set(folderKey, list);
    }
  }

  const groups: ZipCaseGroup[] = [];
  for (const [folderKey, items] of bucket) {
    const caseTitle =
      folderKey === "(root)" ? `${prefix} — (root files)` : `${prefix} — ${folderKey}`;
    const files: File[] = items.map(({ entryName, buffer }) => {
      const name = entryName.split("/").pop() || entryName;
      const type = mimeForName(name);
      return new File([new Uint8Array(buffer)], name, { type });
    });
    if (files.length) groups.push({ caseTitle, files });
  }

  return groups;
}
