export type ProviderName = 'DexScreener' | 'Solana RPC' | 'Helius' | 'Birdeye' | 'Solscan';

export interface ProviderStatus {
  name: ProviderName;
  configured: boolean;
  available: boolean;
  message?: string;
}

export interface WalletTokenPosition {
  currentBalance: number | null;
  currentBalanceFormatted: string;
  currentValueUsd: number | null;
  status: 'holding' | 'sold' | 'partial' | 'increased' | 'unknown';
}

export interface TokenHolder {
  address: string;
  percentage: number | null;
  balance: string;
  rank: number;
  valueUsd: number | null;
  position?: WalletTokenPosition | null;
}

export interface EarlyBuyer {
  address: string;
  firstBuyTimestamp: number | null;
  initialAmount: number | null;
  initialAmountFormatted: string;
  signature: string | null;
  solscanUrl: string;
  solscanTxUrl: string | null;
  position?: WalletTokenPosition | null;
  currentBalance: number | null;
  currentBalanceFormatted: string;
  percentOfInitial: number | null;
  positionStatus: 'holding' | 'partial' | 'sold' | null;
  realizedPnl: number | null;
  unrealizedPnl: number | null;
}

export interface TraderSummary {
  address: string;
  volume: number | null;
  buyVolume: number | null;
  sellVolume: number | null;
  realizedPnl: number | null;
  unrealizedPnl: number | null;
  totalPnl: number | null;
  avgBuyPrice: number | null;
  avgSellPrice: number | null;
  buyCount: number | null;
  sellCount: number | null;
  netTokenBalance: number | null;
  netTokenBalanceFormatted: string;
  solscanUrl: string;
}

export interface DexBoost {
  active: number;
  totalAmount: number | null;
}

export interface TokenAnalysis {
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
  topTraders: TraderSummary[];
  earlyBuyers: EarlyBuyer[];
  developer: {
    address: string | null;
    balancePercentage: number | null;
    source: string;
    risk: 'high' | 'medium' | 'low' | 'unknown';
  };
  dexBoosts: DexBoost | null;
  relationships: {
    wallets: string[];
    directCount: number;
    source: string;
  };
  monitoring: {
    boosts: number | null;
    paidOrders: boolean | null;
    paidOrderTypes: string[];
    warnings: string[];
  };
  providers: ProviderStatus[];
}

export interface WalletHolding {
  address: string;
  symbol: string;
  name: string;
  logo: string | null;
  balance: number | null;
  valueUsd: number | null;
  decimals: number | null;
}

export interface WalletActivity {
  signature: string;
  type: string;
  description: string;
  timestamp: string | null;
  source: string;
}

export interface WalletAnalysis {
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
    risk: 'high' | 'medium' | 'low' | 'unknown';
    notes: string[];
  };
  providers: ProviderStatus[];
}

export interface OhlcvItem {
  unixTime: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}
