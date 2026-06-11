/**
 * Admin dashboard — create → fund → authorize → deliver.
 *
 * SCAFFOLD ONLY. The steps below are placeholders for the real flow wired to
 * @tokenops/sdk/fhe-airdrop/react hooks:
 *   1. Upload/validate recipients (CSV → {address, amount})
 *   2. useCreateConfidentialAirdropAndGetAddress({ token, start, end, canExtend, admin })
 *   3. setOperator (uint48 deadline) + useFundConfidentialAirdrop
 *   4. per recipient: encryptUint64 → useSignClaimAuthorization
 *   5. export { encryptedInput, signature, amount } payloads / claim links
 */
export function Admin() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Create a confidential airdrop</h1>
      <p className="mt-2 text-neutral-400">
        Upload recipients, fund the campaign, and authorize private allocations.
      </p>

      <ol className="mt-8 space-y-3">
        <Step n={1} title="Add recipients" desc="Upload a CSV of address, amount." />
        <Step n={2} title="Create campaign" desc="Deploy via the TokenOps factory." />
        <Step n={3} title="Fund" desc="Authorize + transfer confidential tokens in." />
        <Step n={4} title="Authorize recipients" desc="Encrypt each amount and sign." />
        <Step n={5} title="Deliver" desc="Export claim links / payloads." />
      </ol>

      <p className="mt-8 text-sm text-neutral-500">
        Flow not yet wired — scaffold step. See <code>scripts/pipeline.ts</code> for the proven
        end-to-end calls this UI will drive.
      </p>
    </div>
  );
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <li className="flex gap-4 rounded-xl border border-white/10 p-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm">
        {n}
      </span>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-neutral-400">{desc}</p>
      </div>
    </li>
  );
}
