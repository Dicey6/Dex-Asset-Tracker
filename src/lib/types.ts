export type ProviderName = 'DexScreener' | 'Helius' | 'Birdeye' | 'Solscan';

export type ProviderStatus = {
  name: ProviderName;
  configured: boolean;
  available: boolean;
  message?: string;
};

export type TokenHolder = {
  address: string;
  percentage: number | null;
  balance: string;
  rank?: number;
  label?: string;
};

export type TokenAnalysis = {
  address: string;
  token: {
    name: string;
    symbol: string;
    logo: string | null;
    priceUsd: number | null;
    priceChange24h: number | null;
    marketCap: number | null;
    fdv: number | null;
    volume24h: number | null;
    buys24h: number | null;
    sells24h: number | null;
    pairCreatedAt: string | null;
    websites: string[];
    socials: { type: string; url: string }[];
    pairUrl: string | null;
  };
  liquidity: {
    totalUsd: number | null;
    venues: { name: string; liquidityUsd: number }[];
    pairCount: number;
    locked: number | null;
  };
  holders: {
    top: TokenHolder[];
    top10Percentage: number | null;
    totalKnown: number | null;
  };
  developer: {
    address: string | null;
    balancePercentage: number | null;
    source: string;
    risk: 'low' | 'medium' | 'high' | 'unknown';
  };
  earlyWallets: {
    address: string;
    amount: string;
    status: 'Holding' | 'Partial' | 'Exited' | 'Unknown';
    source: string;
  }[];
  relationships: {
    wallets: string[];
    directCount: number;
    source: string;
  };
  monitoring: {
    boosts: number | null;
    paidOrders: boolean | null;
    warnings: string[];
  };
  providers: ProviderStatus[];
};

export type WalletHolding = {
  address: string;
  symbol: string;
  name: string;
  logo: string | null;
  balance: number | null;
  valueUsd: number | null;
  decimals: number | null;
};

export type WalletActivity = {
  signature: string;
  type: string;
  description: string;
  timestamp: string | null;
  source: string;
};

export type WalletAnalysis = {
  address: string;
  portfolio: {
    solBalance: number | null;
    totalValueUsd: number | null;
    tokenCount: number;
    nftCount: number;
  };
  holdings: WalletHolding[];
  activity: WalletActivity[];
  signals: {
    activeDays: number | null;
    topHoldingPercentage: number | null;
    risk: 'low' | 'medium' | 'high' | 'unknown';
    notes: string[];
  };
  providers: ProviderStatus[];
};

export type ApiError = {
  error: string;
  code?: string;
  providers?: ProviderStatus[];
};