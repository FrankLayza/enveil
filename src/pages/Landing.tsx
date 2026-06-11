import { Link } from "react-router-dom";

export function Landing() {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="mb-4 rounded-full border border-white/10 px-3 py-1 text-xs text-neutral-400">
        Built on the Zama Protocol · TokenOps SDK
      </span>
      <h1 className="max-w-2xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
        Airdrop tokens without revealing who gets how much.
      </h1>
      <p className="mt-5 max-w-xl text-pretty text-neutral-400">
        DropShield distributes confidential ERC-7984 tokens with amounts encrypted on-chain.
        Recipients verify and claim only their own allocation — no one else can see it.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/admin"
          className="rounded-lg bg-white px-5 py-2.5 font-medium text-neutral-900 hover:bg-neutral-200"
        >
          Create an airdrop
        </Link>
        <Link
          to="/claim"
          className="rounded-lg border border-white/15 px-5 py-2.5 font-medium hover:bg-white/5"
        >
          Claim my tokens
        </Link>
      </div>

      <div className="mt-16 grid w-full max-w-3xl gap-4 sm:grid-cols-3">
        <Feature title="Private" body="Amounts are encrypted on-chain via FHE. Validators can't read them." />
        <Feature title="Verifiable" body="Each recipient decrypts and verifies only their own allocation." />
        <Feature title="Composable" body="Powered by the audited TokenOps confidential airdrop contracts." />
      </div>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/10 p-5 text-left">
      <h3 className="font-medium">{title}</h3>
      <p className="mt-1 text-sm text-neutral-400">{body}</p>
    </div>
  );
}
