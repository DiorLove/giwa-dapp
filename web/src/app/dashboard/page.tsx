"use client";
import Link from "next/link";
import { useAccount, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import {
  ArrowUpRight,
  Coins,
  FileText,
  Fuel,
  Landmark,
  Plus,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import {
  BRIDGE_POOL_ADDRESS,
  FACTORY_ADDRESS,
  JEONSE_FACTORY_ADDRESS,
  LEGACY_FACTORY_ADDRESS,
  LEGACY_JEONSE_FACTORY_ADDRESS,
  MOCKKRW_ADDRESS,
  bridgePoolAbi,
  factoryAbi,
  fmtKRW,
  jeonseAbi,
  jeonseFactoryAbi,
  mockKrwAbi,
} from "@/lib/contracts";
import { AppNav } from "@/components/AppNav";
import { AnimatedNumber, FadeUp, useMounted } from "@/components/Motion";
import { useLang } from "@/lib/i18n";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

export default function Dashboard() {
  const { t } = useLang();
  const mounted = useMounted();
  const { address } = useAccount();
  const { writeContract, isPending: minting } = useWriteContract();

  const { data: stats, refetch } = useReadContracts({
    contracts: [
      { address: JEONSE_FACTORY_ADDRESS, abi: jeonseFactoryAbi, functionName: "getAll" },
      { address: LEGACY_JEONSE_FACTORY_ADDRESS, abi: jeonseFactoryAbi, functionName: "getAll" },
      { address: FACTORY_ADDRESS, abi: factoryAbi, functionName: "getAll" },
      { address: LEGACY_FACTORY_ADDRESS, abi: factoryAbi, functionName: "getAll" },
      { address: BRIDGE_POOL_ADDRESS, abi: bridgePoolAbi, functionName: "totalAssets" },
      { address: BRIDGE_POOL_ADDRESS, abi: bridgePoolAbi, functionName: "totalOutstanding" },
    ],
    query: { refetchInterval: 6000 },
  });

  const { data: balance } = useReadContract({
    address: MOCKKRW_ADDRESS,
    abi: mockKrwAbi,
    functionName: "balanceOf",
    args: [address ?? ZERO],
    query: { enabled: !!address, refetchInterval: 5000 },
  });

  const escrows = [
    ...(((stats?.[1]?.result as `0x${string}`[]) ?? []) as `0x${string}`[]),
    ...(((stats?.[0]?.result as `0x${string}`[]) ?? []) as `0x${string}`[]),
  ];
  const escrowCount = escrows.length;
  const circleCount =
    ((stats?.[2]?.result as unknown[] | undefined)?.length ?? 0) +
    ((stats?.[3]?.result as unknown[] | undefined)?.length ?? 0);
  const poolAssets = (stats?.[4]?.result as bigint | undefined) ?? 0n;
  const poolOutstanding = (stats?.[5]?.result as bigint | undefined) ?? 0n;
  const myBalance = (balance as bigint | undefined) ?? 0n;

  // 락된 전세금 합계 (TVL 계산용)
  const { data: escInfos } = useReadContracts({
    contracts: escrows.flatMap((e) => [
      { address: e, abi: jeonseAbi, functionName: "state" } as const,
      { address: e, abi: jeonseAbi, functionName: "jeonseAmount" } as const,
    ]),
    query: { enabled: escrows.length > 0, refetchInterval: 8000 },
  });
  const lockedEscrow = escrows.reduce((acc, _, i) => {
    const st = escInfos?.[i * 2]?.result as number | undefined;
    const amt = escInfos?.[i * 2 + 1]?.result as bigint | undefined;
    return st === 1 ? acc + (amt ?? 0n) : acc;
  }, 0n);
  const tvl = poolAssets + lockedEscrow;

  const utilization =
    poolAssets > 0n ? Number((poolOutstanding * 1_000_000n) / poolAssets) / 1_000_000 : 0;
  const poolApy = 0.005 * 26 * utilization * 100;
  const maxApy = 0.005 * 26 * 100;

  const label = "text-[11px] uppercase tracking-[0.15em] text-white/35";

  const features = [
    {
      href: "/jeonse",
      icon: FileText,
      accent: "sky",
      badge: t("메인", "Core"),
      title: t("전세 에스크로", "Jeonse Escrow"),
      desc: t(
        "신규 세입자의 전세금을 락하고, 정산일에 보증금 반환과 잔금 지급을 한 트랜잭션으로 동시에 실행합니다.",
        "Lock the incoming deposit; refund and balance settle together in one transaction."
      ),
      stat: t(`전체 ${escrowCount}건 · 락 ${fmtKRW(lockedEscrow)}`, `${escrowCount} deals · ${fmtKRW(lockedEscrow)} locked`),
    },
    {
      href: "/pool",
      icon: Landmark,
      accent: "emerald",
      badge: poolApy > 0 ? `APY ${poolApy.toFixed(1)}%` : t("이자 풀", "Yield"),
      title: t("브리지 풀", "Bridge Pool"),
      desc: t(
        "이사 날짜 사이 며칠을 잇는 초단기 유동성. 예치하면 선지급 수수료를 연이자로 받습니다.",
        "Ultra-short liquidity bridging moving-date gaps. Deposit to earn advance fees as yield."
      ),
      stat: t(
        `예상 APY ${poolApy.toFixed(1)}% (최대 ${maxApy.toFixed(0)}%) · 풀 ${fmtKRW(poolAssets)}`,
        `~${poolApy.toFixed(1)}% APY (up to ${maxApy.toFixed(0)}%) · ${fmtKRW(poolAssets)}`
      ),
    },
    {
      href: "/app",
      icon: Users,
      accent: "violet",
      title: t("계모임", "Gye Circles"),
      desc: t(
        "계주 없는 온체인 계. 초대 링크로 모이고 온체인 추첨으로 순번을 정해 순서대로 곗돈을 받습니다.",
        "Organizer-free rotating savings. Gather by invite, draw the order on-chain, collect in turn."
      ),
      stat: t(`전체 ${circleCount}개`, `${circleCount} circles`),
    },
    {
      href: "/me",
      icon: User,
      accent: "amber",
      title: t("마이페이지", "My Page"),
      desc: t(
        "내 자산과 거래 내역을 한곳에서. mKRW·가스·수령 가능 금액과 참여 중인 계·전세 거래를 확인합니다.",
        "Your assets and activity in one place: balances, claimables, and the deals you're in."
      ),
      stat:
        mounted && address
          ? t(`내 잔액 ${fmtKRW(myBalance)}`, `${fmtKRW(myBalance)} balance`)
          : t("지갑 연결 필요", "Connect wallet"),
    },
  ];

  const accentMap: Record<string, { icon: string; glow: string; badge: string }> = {
    sky: {
      icon: "text-sky-300 border-sky-400/20 bg-sky-400/[0.08]",
      glow: "hover:shadow-[0_0_40px_-12px_rgba(56,189,248,0.35)]",
      badge: "border-sky-400/20 bg-sky-400/10 text-sky-300",
    },
    emerald: {
      icon: "text-emerald-300 border-emerald-400/20 bg-emerald-400/[0.08]",
      glow: "hover:shadow-[0_0_40px_-12px_rgba(16,185,129,0.4)]",
      badge: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    },
    violet: {
      icon: "text-violet-300 border-violet-400/20 bg-violet-400/[0.08]",
      glow: "hover:shadow-[0_0_40px_-12px_rgba(167,139,250,0.35)]",
      badge: "border-violet-400/20 bg-violet-400/10 text-violet-300",
    },
    amber: {
      icon: "text-amber-300 border-amber-400/20 bg-amber-400/[0.08]",
      glow: "hover:shadow-[0_0_40px_-12px_rgba(251,191,36,0.3)]",
      badge: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    },
  };

  return (
    <div className="min-h-screen bg-black">
      <AppNav />
      <main className="mx-auto max-w-6xl px-4 pb-24 md:px-6">
        {/* 헤더 */}
        <FadeUp className="pt-12 pb-6 md:pt-14">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/35">IEUM Protocol</p>
          <h1 className="font-display text-4xl tracking-tight text-white md:text-5xl">
            {t("대시보드", "Dashboard")}
          </h1>
        </FadeUp>

        {/* TVL 히어로 */}
        <FadeUp
          delay={0.05}
          className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 md:p-8"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(16,185,129,0.10),transparent_55%)]" />
          <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <p className={`flex items-center gap-1.5 ${label}`}>
                <TrendingUp size={12} className="text-emerald-300/70" />
                {t("총 예치 자산 (TVL)", "Total Value Locked")}
              </p>
              <p className="mt-2 font-display text-5xl tracking-tight text-white tabular-nums md:text-6xl">
                <AnimatedNumber
                  value={Number(tvl / 10n ** 18n)}
                  format={(n) => "₩" + n.toLocaleString("ko-KR")}
                />
              </p>
              <p className="mt-2 text-xs text-white/35">
                {t(
                  `브리지 풀 ${fmtKRW(poolAssets)} · 전세 락 ${fmtKRW(lockedEscrow)}`,
                  `Bridge pool ${fmtKRW(poolAssets)} · jeonse locked ${fmtKRW(lockedEscrow)}`
                )}
              </p>
            </div>
            {/* 요약 칩 */}
            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.06] md:w-auto">
              {[
                { k: t("에스크로", "Escrows"), v: String(escrowCount) },
                { k: t("계모임", "Circles"), v: String(circleCount) },
                { k: t("풀 APY", "Pool APY"), v: `${poolApy.toFixed(1)}%`, accent: true },
              ].map((c) => (
                <div key={c.k} className="bg-black px-5 py-4 text-center md:px-6">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-white/35">{c.k}</p>
                  <p
                    className={`mt-1 text-lg font-medium tabular-nums ${c.accent ? "text-emerald-300" : "text-white"}`}
                  >
                    {c.v}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </FadeUp>

        {/* 기능 카드 */}
        <FadeUp delay={0.12} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {features.map((f) => {
            const a = accentMap[f.accent];
            return (
              <Link
                key={f.href}
                href={f.href}
                className={`group flex flex-col justify-between gap-6 rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.04] md:p-7 ${a.glow}`}
              >
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl border ${a.icon}`}>
                      <f.icon size={20} />
                    </span>
                    {f.badge && (
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tabular-nums ${a.badge}`}
                      >
                        {f.badge}
                      </span>
                    )}
                  </div>
                  <h2 className="flex items-center gap-2 text-lg font-medium text-white">
                    {f.title}
                    <ArrowUpRight
                      size={16}
                      className="text-white/25 transition-all group-hover:translate-x-0.5 group-hover:text-white/60"
                    />
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-white/45">{f.desc}</p>
                </div>
                <p className="border-t border-white/[0.06] pt-4 text-xs text-white/45 tabular-nums">
                  {f.stat}
                </p>
              </Link>
            );
          })}
        </FadeUp>

        {/* 빠른 작업 */}
        <FadeUp delay={0.18} className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { href: "/jeonse/create", icon: Plus, label: t("에스크로 개설", "New Escrow") },
            { href: "/create", icon: Users, label: t("계모임 개설", "New Circle") },
            { href: "/pool", icon: Landmark, label: t("풀 예치", "Deposit to Pool") },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="pressable flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5 text-sm font-medium text-white/80 transition-colors hover:border-white/20 hover:text-white"
            >
              <a.icon size={16} className="shrink-0 text-white/40" />
              <span className="truncate">{a.label}</span>
            </Link>
          ))}
          {mounted && address ? (
            <button
              disabled={minting}
              onClick={() =>
                writeContract(
                  { address: MOCKKRW_ADDRESS, abi: mockKrwAbi, functionName: "faucet" },
                  { onSuccess: () => setTimeout(() => refetch(), 2000) }
                )
              }
              className="pressable flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5 text-sm font-medium text-white/80 transition-colors hover:border-white/20 hover:text-white disabled:opacity-40"
            >
              <Coins size={16} className="shrink-0 text-white/40" />
              <span className="truncate">
                {minting ? t("발급 중", "Minting") : t("테스트 원화 발급", "Mint Test KRW")}
              </span>
            </button>
          ) : (
            <a
              href="https://faucet.giwa.io"
              target="_blank"
              rel="noreferrer"
              className="pressable flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5 text-sm font-medium text-white/80 transition-colors hover:border-white/20 hover:text-white"
            >
              <Fuel size={16} className="shrink-0 text-white/40" />
              <span className="truncate">{t("가스 받기", "Get Gas")}</span>
            </a>
          )}
        </FadeUp>

        <p className="mt-10 text-xs leading-relaxed text-white/25">
          {t(
            "GIWA Sepolia 테스트넷에서 동작하는 데모입니다. 납입 통화는 모의 원화(mKRW)이며 무료로 발급받을 수 있습니다.",
            "A demo on GIWA Sepolia testnet. Payments use mock KRW (mKRW), mintable for free."
          )}
        </p>
      </main>
    </div>
  );
}
