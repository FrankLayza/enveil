import { useMemo, type ReactNode } from "react";
import { WagmiProvider, useWalletClient } from "wagmi";
import { sepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { createPublicClient, http } from "viem";
import {
  ZamaProvider,
  RelayerWeb,
  SepoliaConfig,
  indexedDBStorage,
} from "@zama-fhe/react-sdk";
import { ViemSigner } from "@zama-fhe/sdk/viem";
import { wagmiConfig } from "@/lib/wagmi";
import { env } from "@/lib/env";
import "@rainbow-me/rainbowkit/styles.css";

/**
 * Provider order matters — inner providers depend on outer context:
 *   WagmiProvider (wallet + chain)
 *     └ QueryClientProvider (async cache; required by both SDKs)
 *         └ ZamaSigned → ZamaProvider (FHE encrypt/decrypt via the relayer)
 *
 * Why ViemSigner and not WagmiSigner: @zama-fhe/react-sdk's WagmiSigner imports
 * `watchConnection` from wagmi, which only exists in wagmi v3 — but @tokenops/sdk
 * requires wagmi v2. So WagmiSigner is unusable here. ViemSigner is wagmi-version
 * agnostic: it reads the connected wallet client (from wagmi's useWalletClient)
 * plus a standalone Sepolia public client.
 */
const queryClient = new QueryClient();

function ZamaSigned({ children }: { children: ReactNode }) {
  const { data: walletClient } = useWalletClient();

  const relayer = useMemo(
    () =>
      new RelayerWeb({
        transports: {
          [SepoliaConfig.chainId]: { ...SepoliaConfig, network: env.rpcUrl || undefined },
        },
        getChainId: () => Promise.resolve(sepolia.id),
      }),
    [],
  );

  const publicClient = useMemo(
    () => createPublicClient({ chain: sepolia, transport: http(env.rpcUrl || undefined) }),
    [],
  );

  // Rebuilds when the wallet connects / account changes. walletClient is
  // undefined until connected — signing operations only run post-connect.
  const signer = useMemo(
    () => new ViemSigner({ walletClient: walletClient ?? undefined, publicClient }),
    [walletClient, publicClient],
  );

  return (
    <ZamaProvider relayer={relayer} signer={signer} storage={indexedDBStorage}>
      {children}
    </ZamaProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={lightTheme({ accentColor: "#1a1a18", borderRadius: "large" })}
          modalSize="compact"
        >
          <ZamaSigned>{children}</ZamaSigned>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
