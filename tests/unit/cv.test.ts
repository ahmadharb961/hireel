import { describe, expect, it } from "vitest";
import { canDownloadCv, detectCvKind, safeCvName } from "@/server/rules/cv";

const bytes = (...b: number[]) => new Uint8Array([...b, 0, 0, 0, 0, 0, 0, 0, 0]);

describe("CV files", () => {
  it("detects PDF and Word from the file contents", () => {
    expect(detectCvKind(bytes(0x25, 0x50, 0x44, 0x46, 0x2d), "cv.pdf")).toBe("pdf");
    expect(detectCvKind(bytes(0x25, 0x50, 0x44, 0x46, 0x2d), "renamed.txt")).toBe("pdf");
    expect(detectCvKind(bytes(0x50, 0x4b, 0x03, 0x04), "cv.docx")).toBe("docx");
    expect(detectCvKind(bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1), "cv.doc")).toBe("doc");
  });
  it("rejects other files, even when renamed", () => {
    expect(detectCvKind(bytes(0x50, 0x4b, 0x03, 0x04), "photos.zip")).toBeNull();
    expect(detectCvKind(bytes(0x89, 0x50, 0x4e, 0x47), "cv.pdf")).toBeNull();
    expect(detectCvKind(bytes(0x3c, 0x68, 0x74, 0x6d, 0x6c), "cv.docx")).toBeNull();
  });
  it("makes safe file names", () => {
    expect(safeCvName("../../etc/<Ahmad> CV.PDF", "pdf")).toBe("etcAhmad CV.pdf");
    expect(safeCvName("سيرتي الذاتية.docx", "docx")).toBe("سيرتي الذاتية.docx");
    expect(safeCvName("", "doc")).toBe("CV.doc");
  });
  it("only lets the right people download", () => {
    expect(canDownloadCv({ kind: "candidate", candidateId: "a" }, "a")).toBe(true);
    expect(canDownloadCv({ kind: "candidate", candidateId: "b" }, "a")).toBe(false);
    expect(canDownloadCv({ kind: "admin" }, "a")).toBe(true);
    expect(canDownloadCv({ kind: "employer", sharedWithCompany: true }, "a")).toBe(true);
    expect(canDownloadCv({ kind: "employer", sharedWithCompany: false }, "a")).toBe(false);
    expect(canDownloadCv({ kind: "none" }, "a")).toBe(false);
  });
});
