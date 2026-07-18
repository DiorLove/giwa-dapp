"use client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider, keepPreviousData } from "@tanstack/react-query";
import { config } from "@/lib/wagmi";
import { LangProvider } from "@/lib/i18n";

// 동시 접속/리페치 중에도 화면 숫자가 0으로 튀지 않도록:
// - placeholderData: keepPreviousData → 새 데이터가 올 때까지 직전 값 유지
// - retry → 일시적 RPC 실패 자동 재시도, structuralSharing 로 불필요한 리렌더 억제
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      placeholderData: keepPreviousData,
      retry: 4,
      retryDelay: (n) => Math.min(1000 * 2 ** n, 5000),
      staleTime: 2_000,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <LangProvider>{children}</LangProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
