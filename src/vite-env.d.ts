/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RPC_URL?: string;
  readonly VITE_MOCK_TOKEN_ADDRESS?: string;
  readonly VITE_AIRDROP_FACTORY_ADDRESS?: string;
  readonly VITE_FACTORY_FROM_BLOCK?: string;
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
