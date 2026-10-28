/** CV upload rules. Pure functions so they can be unit-tested. */

export const MAX_CV_BYTES = 5 * 1024 * 1024;

export const CV_TYPES = {
  pdf: { mime: "application/pdf", ext: "pdf" },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: "docx" },
  doc: { mime: "application/msword", ext: "doc" },
} as const;
export type CvKind = keyof typeof CV_TYPES;

/**
 * Works out the real file type from its first bytes, never from the name the browser sends.
 * .docx files are zip archives, so the name must also end in .docx.
 */
export function detectCvKind(head: Uint8Array, fileName: string): CvKind | null {
  const starts = (sig: number[]) => sig.every((b, i) => head[i] === b);
  if (starts([0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf"; // %PDF-
  if (starts([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) && /\.doc$/i.test(fileName)) return "doc";
  if (starts([0x50, 0x4b, 0x03, 0x04]) && /\.docx$/i.test(fileName)) return "docx";
  return null;
}

/** A safe download name: letters, numbers, spaces, dashes and underscores; keeps the right extension. */
export function safeCvName(original: string, kind: CvKind) {
  const base = original.replace(/\.[^.]*$/, "").normalize("NFKC").replace(/[^\p{L}\p{N} _-]/gu, "").trim().slice(0, 80) || "CV";
  return `${base}.${CV_TYPES[kind].ext}`;
}

export type CvViewer =
  | { kind: "candidate"; candidateId: string }
  | { kind: "admin" }
  | { kind: "employer"; sharedWithCompany: boolean }
  | { kind: "none" };

/** Only the candidate, an admin, or a company the candidate accepted and shared their CV with. */
export function canDownloadCv(viewer: CvViewer, candidateId: string) {
  if (viewer.kind === "admin") return true;
  if (viewer.kind === "candidate") return viewer.candidateId === candidateId;
  if (viewer.kind === "employer") return viewer.sharedWithCompany;
  return false;
}
