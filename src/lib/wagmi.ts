import { createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { env } from "@/lib/env";

/**
 * wagmi config — pinned to wagmi v2 (TokenOps SDK peer requirement; do NOT bump to v3).
 * Single chain (Sepolia) with an injected connector (MetaMask et al.).
 */
export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http(env.rpcUrl || undefined),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
