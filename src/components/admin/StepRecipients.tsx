import { useCallback, useRef, useState } from "react";
import {
  type Recipient,
  type CampaignType,
  validateRecipient,
  parseRecipientsCsv,
  totalRawUnits,
  formatTokens,
  recipientNoun,
} from "@/lib/recipients";
import { CampaignTypeSelector } from "@/components/admin/CampaignTypeSelector";
import { ScheduleBuilder } from "@/components/admin/ScheduleBuilder";
import type { VestingSchedule } from "@/lib/vesting";

type SchedulePartial = Omit<VestingSchedule, "startTs">;

// Unique row id. Must NOT be a module-level counter — Vite HMR resets it to 0,
// so newly added rows would reuse ids (r0, r1…) already held in parent state,
// producing duplicate React keys (typed values render against the wrong row).
let _seq = 0;
const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `r-${crypto.randomUUID()}`
    : `r-${Date.now().toString(36)}-${_seq++}`;

/**
 * Step 1 — Recipients. CSV dropzone + editable table + live total.
 * Pure frontend: no chain calls, no relayer. Emits a clean recipient list upward.
 */
export function StepRecipients({
  recipients,
  setRecipients,
  campaignType,
  setCampaignType,
  campaignName,
  setCampaignName,
  schedule,
  setSchedule,
  startTs,
  onNext,
}: {
  recipients: Recipient[];
  setRecipients: (r: Recipient[]) => void;
  campaignType: CampaignType;
  setCampaignType: (t: CampaignType) => void;
  campaignName: string;
  setCampaignName: (v: string) => void;
  schedule: SchedulePartial;
  setSchedule: (s: SchedulePartial) => void;
  startTs: number;
  onNext: () => void;
}) {
  const noun = recipientNoun(campaignType);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const allAddresses = recipients.map((r) => r.address);
  const issuesById = new Map(
    recipients.map((r) => [r.id, validateRecipient(r, allAddresses)]),
  );
  const validCount = recipients.filter((r) => (issuesById.get(r.id) ?? []).length === 0).length;
  const total = totalRawUnits(recipients.filter((r) => (issuesById.get(r.id) ?? []).length === 0));
  const canAdvance = recipients.length > 0 && validCount === recipients.length;

  const ingest = useCallback(
    (text: string) => {
      const parsed = parseRecipientsCsv(text, newId);
      if (parsed.length) {
        // Replace placeholder-empty rows; otherwise append.
        const existing = recipients.filter((r) => r.address.trim() || r.amount.trim());
        setRecipients([...existing, ...parsed]);
      }
    },
    [recipients, setRecipients],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) file.text().then(ingest);
    },
    [ingest],
  );

  const addRow = () =>
    setRecipients([...recipients, { id: newId(), address: "", amount: "", label: "" }]);
  const editRow = (id: string, field: "address" | "amount" | "label", value: string) =>
    setRecipients(recipients.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  const removeRow = (id: string) => setRecipients(recipients.filter((r) => r.id !== id));

  return (
    <div className="animate-step-in">
      <div className="mb-6">
        <h2 className="text-lg font-semibold tracking-tight text-ink">Add recipients</h2>
        <p className="text-sm text-mute">
          Import a CSV or enter who gets paid and how much. Nothing here touches the
          chain yet — amounts are encrypted in a later step.
        </p>
      </div>

      {/* Campaign name — off-chain label shown on the dashboard. */}
      <div className="mb-6">
        <label className="block text-xs font-medium uppercase tracking-wider text-faint mb-1.5">
          Campaign name <span className="normal-case text-faint/70">(optional)</span>
        </label>
        <input
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          placeholder="e.g. Q2 Contributor Payroll"
          className="w-full rounded-xl border border-edge bg-panel-2 px-4 py-3 text-sm text-ink placeholder:text-mute/50 transition-all duration-150 hover:border-edge-strong focus:border-(--card-accent) focus:bg-panel focus:outline-none focus-visible:outline-(--card-accent) focus:ring-4 focus:ring-(--card-accent)/10 shadow-xs"
        />
      </div>

      {/* Campaign type — display-only framing for the whole wizard. */}
      <div className="mb-6">
        <CampaignTypeSelector value={campaignType} onChange={setCampaignType} />
      </div>

      {/* Dropzone */}
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={
          "flex cursor-pointer flex-col items-center justify-center rounded-[18px] border-2 border-dashed px-6 py-12 text-center transition-all duration-150 " +
          (dragging
            ? "border-(--card-accent) bg-(--card-accent-tint)/30 shadow-xs"
            : "border-edge bg-panel-2/60 hover:border-(--card-accent)/50 hover:bg-panel-2 hover:shadow-xs")
        }
      >
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv,text/plain"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) f.text().then(ingest);
            e.target.value = "";
          }}
        />
        <UploadIcon />
        <p className="mt-3 text-lg font-medium text-ink">Drop recipients.csv here</p>
        <p className="mt-1 text-sm text-mute">
          Columns: <span className="font-mono text-faint">address, amount, label</span> — label
          is optional, or add rows manually below
        </p>
      </label>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-xl border border-edge bg-panel shadow-sm">
        <div className="hidden sm:grid grid-cols-[1fr_170px_120px_40px] items-center gap-3 border-b border-edge bg-panel-2 px-4 py-3">
          <span className="text-xs font-medium uppercase tracking-wider text-faint">
            Wallet address
          </span>
          <span className="text-xs font-medium uppercase tracking-wider text-faint">
            Label
          </span>
          <span className="text-right text-xs font-medium uppercase tracking-wider text-faint">
            Amount
          </span>
          <span />
        </div>

        {recipients.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-faint">
            No recipients yet. Drop a CSV above or{" "}
            <button
              onClick={addRow}
              className="font-medium text-iris underline-offset-2 hover:underline"
            >
              add the first row
            </button>
            .
          </div>
        ) : (
          recipients.map((r) => {
            const issues = issuesById.get(r.id) ?? [];
            const addrIssue = issues.find((i) => i.field === "address");
            const amtIssue = issues.find((i) => i.field === "amount");
            return (
              <div
                key={r.id}
                className="flex flex-col gap-3 border-b border-edge/60 px-4 py-4 last:border-b-0 sm:grid sm:grid-cols-[1fr_170px_120px_40px] sm:items-start sm:gap-3 sm:py-3 transition-colors hover:bg-panel-2/30"
              >
                <div className="w-full">
                    <input
                      value={r.address}
                      onChange={(e) => editRow(r.id, "address", e.target.value)}
                      placeholder="0x recipient wallet address"
                      spellCheck={false}
                      className={
                        "w-full rounded-[10px] border px-3 py-2.5 font-mono text-sm transition-all duration-200 focus:outline-none focus:ring-4 " +
                        (addrIssue
                          ? "border-danger/40 bg-danger/5 text-danger placeholder:text-danger/40 focus:border-danger focus-visible:outline-danger focus:ring-danger/20"
                          : "border-edge bg-panel-2/65 text-ink placeholder:text-mute/50 hover:border-edge-strong focus:border-(--card-accent) focus:bg-panel focus-visible:outline-(--card-accent) focus:ring-(--card-accent)/10")
                      }
                    />
                    {addrIssue && (
                      <span className="mt-1.5 flex items-start gap-1.5 text-[11px] font-semibold text-danger">
                        <svg className="shrink-0 mt-0.5" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        {addrIssue.message}
                      </span>
                    )}
                </div>
                <div className="w-full">
                    <input
                      value={r.label ?? ""}
                      onChange={(e) => editRow(r.id, "label", e.target.value)}
                      placeholder="Label (optional)"
                      className="w-full rounded-[10px] border border-edge bg-panel-2/65 px-3 py-2.5 text-sm text-ink placeholder:text-mute/50 transition-all duration-150 hover:border-edge-strong focus:border-(--card-accent) focus:bg-panel focus:outline-none focus-visible:outline-(--card-accent) focus:ring-4 focus:ring-(--card-accent)/10"
                    />
                </div>
                <div className="flex items-start gap-2.5 sm:block sm:text-right">
                  <div className="flex-1 sm:w-auto">
                      <input
                        value={r.amount}
                        onChange={(e) => editRow(r.id, "amount", e.target.value)}
                        placeholder="Amount"
                        inputMode="decimal"
                        className={
                          "w-full sm:w-32 rounded-[10px] border px-3 py-2.5 text-left sm:text-right font-mono text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-4 " +
                          (amtIssue
                            ? "border-danger/40 bg-danger/5 text-danger placeholder:text-danger/40 focus:border-danger focus-visible:outline-danger focus:ring-danger/20"
                            : "border-edge bg-panel-2/65 text-ink placeholder:text-mute/50 hover:border-edge-strong focus:border-(--card-accent) focus:bg-panel focus-visible:outline-(--card-accent) focus:ring-(--card-accent)/10")
                        }
                      />
                      {amtIssue && (
                        <span className="mt-1.5 flex items-start gap-1.5 text-[11px] font-semibold text-danger sm:justify-end">
                          <svg className="shrink-0 mt-0.5" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                          <span className="text-left sm:text-right">{amtIssue.message}</span>
                        </span>
                      )}
                  </div>
                  <button
                    onClick={() => removeRow(r.id)}
                    aria-label="Remove recipient"
                    className="flex sm:hidden h-9 w-9 items-center justify-center rounded-md border border-edge-strong bg-panel text-mute transition-colors duration-150 hover:bg-danger/10 hover:text-danger"
                  >
                    <TrashIcon />
                  </button>
                </div>
                <button
                  onClick={() => removeRow(r.id)}
                  aria-label="Remove recipient"
                  className="hidden sm:flex mt-1 h-9 w-9 items-center justify-center rounded-md text-faint transition-colors duration-150 hover:bg-danger/10 hover:text-danger"
                >
                  <TrashIcon />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Add row */}
      {recipients.length > 0 && (
        <button
          onClick={addRow}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-mute transition-colors duration-150 hover:text-ink"
        >
          <PlusIcon /> Add row
        </button>
      )}

      {/* Vesting-only: unlock schedule builder. Splits each recipient's total
          across dated, confidential tranches. */}
      {campaignType === "vesting" && (
        <div className="mt-6">
          <ScheduleBuilder
            schedule={schedule}
            onChange={setSchedule}
            recipients={recipients.filter((r) => (issuesById.get(r.id) ?? []).length === 0)}
            startTs={startTs}
          />
        </div>
      )}

      {/* Footer: total + advance */}
      <div className="mt-6 flex flex-col gap-4 border-t border-edge pt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <p className="text-sm text-mute text-center sm:text-left">
          <span className="font-mono font-medium text-ink">{validCount}</span>{" "}
          {noun}{validCount === 1 ? "" : "s"}
          <span className="mx-2 text-ink/30">·</span>
          <span className="font-mono font-bold" style={{ color: "var(--card-accent)" }}>
            {formatTokens(total)}
          </span>{" "}
          tokens total
          {validCount < recipients.length && (
            <span className="mt-1 flex items-center gap-1.5 text-danger sm:mt-0 sm:inline-flex font-medium bg-danger/10 px-2.5 py-0.5 rounded-full">
              <span className="hidden sm:inline-block mr-1 text-danger/40">•</span>
              {recipients.length - validCount} need fixing
            </span>
          )}
        </p>
        <button
          onClick={onNext}
          disabled={!canAdvance}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold shadow-md transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 hover:-translate-y-0.5"
          style={{ backgroundColor: "var(--card-accent)", color: "var(--card-accent-ink)" }}
        >
          Next: create campaign <ArrowIcon />
        </button>
      </div>
    </div>
  );
}

/* ── icons (sized to their text) ───────────────────────────────────────── */
function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-mute)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
