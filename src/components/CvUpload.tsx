"use client";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useToast } from "@/components/Toast";

type Cv = { fileName: string; size: number } | null;

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Upload, replace, download or remove the candidate's own CV (PDF or Word, up to 5 MB). */
export function CvUpload({ candidateId, initial }: { candidateId: string; initial: Cv }) {
  const t = useTranslations("cvFile");
  const te = useTranslations("errors");
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [cv, setCv] = useState<Cv>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upload(file?: File) {
    if (!file) return;
    setErr(null);
    if (file.size > 5 * 1024 * 1024) return setErr(te("cv_too_big"));
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/cv", { method: "POST", body: fd });
      const d = await r.json().catch(() => ({ ok: false, error: "generic" }));
      if (!d.ok) return setErr(te(d.error ?? "generic"));
      setCv({ fileName: d.fileName, size: d.size });
      toast(t("uploaded"));
    } catch {
      setErr(te("network"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(t("removeConfirm"))) return;
    setBusy(true);
    try {
      const r = await fetch("/api/cv", { method: "DELETE" });
      if (r.ok) { setCv(null); toast(t("removed")); } else setErr(te("generic"));
    } catch {
      setErr(te("network"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cvbox">
      <input ref={input} type="file" hidden accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
      {cv ? (
        <div className="cvfile">
          <span className="cvfile-ic" aria-hidden="true">{/\.pdf$/i.test(cv.fileName) ? "PDF" : "DOC"}</span>
          <span className="cvfile-name"><b>{cv.fileName}</b><span>{kb(cv.size)}</span></span>
          <a className="btn sm o" href={`/api/cv/${candidateId}`}>{t("download")}</a>
        </div>
      ) : <p className="note">{t("none")}</p>}
      <div className="row" style={{ marginTop: 10 }}>
        <button type="button" className="btn sm" disabled={busy} onClick={() => input.current?.click()}>{busy ? "…" : cv ? t("replace") : t("upload")}</button>
        {cv ? <button type="button" className="btn sm g" disabled={busy} onClick={remove}>{t("remove")}</button> : null}
      </div>
      {err ? <p className="err" role="alert">{err}</p> : null}
      <p className="note" style={{ marginTop: 8 }}>{t("help")}</p>
    </div>
  );
}
