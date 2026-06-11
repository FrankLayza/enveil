import { useAccount, useConnect, useDisconnect } from "wagmi";

/** Minimal connect/disconnect button. Visual polish comes with the design pass. */
export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="rounded-md border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5"
        title={address}
      >
        {address.slice(0, 6)}…{address.slice(-4)}
      </button>
    );
  }

  const injected = connectors[0];
  return (
    <button
      onClick={() => injected && connect({ connector: injected })}
      disabled={!injected || isPending}
      className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-neutral-200 disabled:opacity-50"
    >
      {isPending ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
