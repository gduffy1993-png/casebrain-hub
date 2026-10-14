"use client";
import { useCallback, useEffect, useState } from "react";
import { FIELD_TITLES, FIELDS, type LearningField } from "@/lib/criminal/controlled-learning/core";

type Correction = { id: string; case_id: string; document_id: string; field: LearningField; label: string;
  expected_value: string; source_page: number; source_line: string; verified_at: string | null };
type Lesson = { id: string; correction_id: string; field: LearningField; label: string; status: string;
  evaluation?: { tested: number; improvements: number; regressions: number; eligible: boolean; reasons: string[] } };
type DocumentOption = { id: string; name: string };
type State = { status: string; canReview: boolean; corrections: Correction[]; lessons: Lesson[] };

export function LearningReview({ documents = [] }: { documents?: DocumentOption[] }) {
  const [state, setState] = useState<State | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [documentId, setDocumentId] = useState(documents[0]?.id ?? "");
  const [field, setField] = useState<LearningField>("defendant");
  const [page, setPage] = useState(1);
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [verified, setVerified] = useState<Record<string, boolean>>({});
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/criminal/learning", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Learning records could not be loaded.");
      setState(data);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Learning records could not be loaded."); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { if (!documentId && documents[0]) setDocumentId(documents[0].id); }, [documentId, documents]);
  async function act(body: object) {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/criminal/learning", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The action could not be completed.");
      setMessage(data.report ? `${data.report.improvements} improvements, ${data.report.regressions} regressions across ${data.report.tested} PDFs. ${data.report.eligible ? "Eligible for separate approval." : data.report.reasons.join(" ")}` : "Saved. No rule affects live answers until it passes testing and is approved.");
      await refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "The action could not be completed."); }
    finally { setBusy(false); }
  }
  const control = "rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";
  if (!state) return <p role="status">{message || "Loading learning review…"}</p>;
  if (!state.canReview) return <p>A solicitor or organisation owner can review corrections and approve learning rules.</p>;
  return <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 text-slate-900" aria-label="Controlled learning">
    <div><h2 className="text-lg font-semibold">Teach CaseBrain from checked papers</h2>
      <p className="mt-1 text-sm text-slate-600">Verified examples can teach recurring field labels. This does not learn legal conclusions or reuse a different client’s facts.</p></div>
    {message && <p role="status" className="rounded bg-blue-50 p-3 text-sm">{message}</p>}
    {state.status !== "ready" ? <p className="rounded bg-amber-50 p-3 text-sm">Controlled learning is {state.status === "disabled" ? "not enabled" : "unavailable"}. Existing extraction continues without learned rules. The database setup and activation must be completed before corrections can be saved.</p> : <>
      {documents.length > 0 && <form className="grid gap-3 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); void act({ action: "capture", documentId, page, rule: { field, label }, expectedValue: value }); }}>
        <label className="grid gap-1 text-sm">Original document<select className={control} value={documentId} onChange={e => setDocumentId(e.target.value)}>{documents.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        <label className="grid gap-1 text-sm">Field<select className={control} value={field} onChange={e => setField(e.target.value as LearningField)}>{FIELDS.map(f => <option key={f} value={f}>{FIELD_TITLES[f]}</option>)}</select></label>
        <label className="grid gap-1 text-sm">PDF page<input className={control} type="number" min={1} max={2000} value={page} onChange={e => setPage(Number(e.target.value))} required /></label>
        <label className="grid gap-1 text-sm">Label printed before the value<input className={control} maxLength={64} value={label} onChange={e => setLabel(e.target.value)} placeholder="For example: Accused individual" required /></label>
        <label className="grid gap-1 text-sm sm:col-span-2">Correct value on that labelled row<input className={control} maxLength={320} value={value} onChange={e => setValue(e.target.value)} required /></label>
        <p className="text-xs text-slate-500 sm:col-span-2">The first version supports explicit single-line rows separated by a colon, tab or vertical bar. Unsupported layouts remain review-required.</p>
        <button disabled={busy} className={control}>Capture correction from source</button>
      </form>}
      <div><h3 className="font-semibold">Source corrections and test examples</h3>
        <p className="text-sm text-slate-600">Check the original document before verifying. Select at least five verified examples from different cases to test a proposed rule.</p>
        {!state.corrections.length && <p className="mt-2 text-sm">No corrections captured yet. Open a case’s File tab to add one.</p>}
        <div className="mt-3 space-y-3">{state.corrections.map(c => <article key={c.id} className="space-y-2 rounded border p-3 text-sm">
          <p><strong>{FIELD_TITLES[c.field]}</strong>: {c.expected_value} · PDF page {c.source_page}</p><blockquote className="rounded bg-slate-50 p-2">{c.source_line}</blockquote>
          {c.verified_at ? <div className="flex flex-wrap gap-3"><label><input type="checkbox" checked={selected.includes(c.id)} onChange={e => setSelected(s => e.target.checked ? [...s, c.id] : s.filter(id => id !== c.id))} /> Use as test example</label>
            {!state.lessons.some(l => l.correction_id === c.id) && <button disabled={busy} className={control} onClick={() => void act({ action: "propose", correctionId: c.id })}>Propose reusable label rule</button>}</div>
          : <div className="space-y-2"><label className="block"><input type="checkbox" checked={!!verified[c.id]} onChange={e => setVerified(v => ({ ...v, [c.id]: e.target.checked }))} /> I checked the original PDF and confirm this label identifies this field.</label>
            <button disabled={busy || !verified[c.id]} className={control} onClick={() => void act({ action: "verify", correctionId: c.id, confirmed: true })}>Verify correction</button></div>}
        </article>)}</div></div>
      <div><h3 className="font-semibold">Reusable rules</h3><div className="mt-3 space-y-3">{state.lessons.map(l => <article key={l.id} className="space-y-2 rounded border p-3 text-sm">
        <p><strong>{l.label}</strong> identifies {FIELD_TITLES[l.field].toLowerCase()} · {l.status}</p>
        {l.evaluation && <p>{l.evaluation.tested} test PDFs · {l.evaluation.improvements} improvements · {l.evaluation.regressions} regressions. {l.evaluation.reasons.join(" ")}</p>}
        {l.status === "proposed" && <div className="flex flex-wrap gap-2"><button className={control} disabled={busy || selected.length < 5 || selected.length > 12} onClick={() => void act({ action: "evaluate", lessonId: l.id, testIds: selected })}>Test on selected examples</button>
          <button className={control} disabled={busy || !l.evaluation?.eligible} onClick={() => void act({ action: "approve", lessonId: l.id })}>Approve for future extraction</button></div>}
        {l.status === "approved" && <button className={control} disabled={busy} onClick={() => void act({ action: "revoke", lessonId: l.id })}>Stop using this rule</button>}
      </article>)}</div></div>
    </>}
  </section>;
}
