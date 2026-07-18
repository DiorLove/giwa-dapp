"use client";
import Link from "next/link";
import { useAccount, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import { ArrowUpRight, FileText, Landmark, User, Users } from "lucide-react";
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

  const features = [
    {
      href: "/jeonse",
      icon: FileText,
      tag: t("메인", "Core"),
      title: t("전세 에스크로", "Jeonse Escrow"),
      desc: t(
        "신규 세입자의 전세금을 락하고, 정산일에 보증금 반환과 잔금 지급을 한 트랜잭션으로 동시에 실행합니다.",
        "Lock the incoming deposit; refund and balance settle together in one transaction."
      ),
      stat: t(`${escrowCount}건 · 락 ${fmtKRW(lockedEscrow)}`, `${escrowCount} deals · ${fmtKRW(lockedEscrow)} locked`),
    },
    {
      href: "/pool",
      icon: Landmark,
      tag: poolApy > 0 ? `APY ${poolApy.toFixed(1)}%` : null,
      title: t("브리지 풀", "Bridge Pool"),
      desc: t(
        "이사 날짜 사이 며칠을 잇는 초단기 유동성. 예치하면 선지급 수수료를 연이자로 받습니다.",
        "Ultra-short liquidity bridging moving-date gaps. Deposit to earn advance fees as yield."
      ),
      stat: t(`예상 APY ${poolApy.toFixed(1)}% · 풀 ${fmtKRW(poolAssets)}`, `~${poolApy.toFixed(1)}% APY · ${fmtKRW(poolAssets)}`),
    },
    {
      href: "/app",
      icon: Users,
      tag: null,
      title: t("계모임", "Gye Circles"),
      desc: t(
        "계주 없는 온체인 계. 초대 링크로 모이고 온체인 추첨으로 순번을 정해 순서대로 곗돈을 받습니다.",
        "Organizer-free rotating savings. Gather by invite, draw the order on-chain, collect in turn."
      ),
      stat: t(`${circleCount}개 운영 중`, `${circleCount} circles`),
    },
    {
      href: "/me",
      icon: User,
      tag: null,
      title: t("마이페이지", "My Page"),
      desc: t(
        "내 자산과 거래 내역을 한곳에서. mKRW·가스·수령 가능 금액과 참여 중인 계·전세 거래를 확인합니다.",
        "Your assets and activity in one place: balances, claimables, and the deals you're in."
      ),
      stat:
        mounted && address
          ? t(`내 잔액 ${fmtKRW(myBalance)}`, `${fmtKRW(myBalance)}`)
          : t("지갑 연결 필요", "Connect wallet"),
    },
  ];

  const quick = [
    { href: "/jeonse/create", label: t("에스크로 개설", "New Escrow") },
    { href: "/create", label: t("계모임 개설", "New Circle") },
    { href: "/pool", label: t("풀 예치", "Deposit") },
  ];

  const kicker = "text-[11px] uppercase tracking-[0.22em] text-white/30";

  return (
    <div className="min-h-screen bg-black">
      <AppNav />
      <main className="mx-auto max-w-5xl px-4 pb-28 md:px-6">
        {/* 헤더 */}
        <FadeUp className="pt-14 pb-10 md:pt-20">
          <p className={`mb-3 ${kicker}`}>IEUM Protocol</p>
          <h1 className="font-display text-5xl tracking-tight text-white md:text-6xl">
            {t("대시보드", "Dashboard")}
          </h1>
        </FadeUp>

        {/* 총 예치 자산 — 명세서형 밴드 */}
        <FadeUp delay={0.05} className="border-y border-white/[0.09] py-8 md:py-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <p className={kicker}>{t("총 예치 자산", "Total Value Locked")}</p>
              <p className="mt-3 font-display text-5xl tracking-tight text-white tabular-nums md:text-[4.25rem] md:leading-[1]">
                <AnimatedNumber
                  value={Number(tvl / 10n ** 18n)}
                  format={(n) => "₩" + n.toLocaleString("ko-KR")}
                />
              </p>
              <p className="mt-3 text-xs text-white/35">
                {t(
                  `브리지 풀 ${fmtKRW(poolAssets)}  ·  전세 락 ${fmtKRW(lockedEscrow)}`,
                  `Bridge pool ${fmtKRW(poolAssets)}  ·  Jeonse locked ${fmtKRW(lockedEscrow)}`
                )}
              </p>
            </div>
            {/* 우측: 하이라인 구분 인라인 지표 */}
            <dl className="flex items-stretch divide-x divide-white/[0.09] text-right">
              {[
                { k: t("에스크로", "Escrows"), v: String(escrowCount), accent: false },
                { k: t("계모임", "Circles"), v: String(circleCount), accent: false },
                { k: t("풀 APY", "Pool APY"), v: `${poolApy.toFixed(1)}%`, accent: true },
              ].map((c) => (
                <div key={c.k} className="px-5 first:pl-0 last:pr-0 md:px-6">
                  <dt className="text-[10px] uppercase tracking-[0.14em] text-white/30">{c.k}</dt>
                  <dd
                    className={`mt-1.5 text-xl font-medium tabular-nums ${
                      c.accent ? "text-emerald-300" : "text-white"
                    }`}
                  >
                    {c.v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </FadeUp>

        {/* 기능 인덱스 */}
        <FadeUp delay={0.12} className="mt-14">
          <p className={`mb-5 ${kicker}`}>{t("기능", "Protocol")}</p>
          <div className="grid grid-cols-1 border-t border-white/[0.09] md:grid-cols-2">
            {features.map((f, i) => (
              <Link
                key={f.href}
                href={f.href}
                className="group flex flex-col gap-5 border-b border-white/[0.09] p-6 transition-colors hover:bg-white/[0.015] md:p-7 md:[&:nth-child(odd)]:border-r"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-xs text-white/25 tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <f.icon size={16} className="text-white/40" strokeWidth={1.5} />
                  </span>
                  {f.tag && (
                    <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] font-medium tabular-nums text-white/50">
                      {f.tag}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="flex items-center gap-1.5 text-xl tracking-tight text-white">
                    {f.title}
                    <ArrowUpRight
                      size={16}
                      strokeWidth={1.5}
                      className="text-white/20 transition-all group-hover:translate-x-0.5 group-hover:text-white/60"
                    />
                  </h2>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/40">{f.desc}</p>
                </div>
                <p className="mt-auto text-xs text-white/35 tabular-nums">{f.stat}</p>
              </Link>
            ))}
          </div>
        </FadeUp>

        {/* 빠른 작업 */}
        <FadeUp delay={0.18} className="mt-12">
          <p className={`mb-4 ${kicker}`}>{t("바로가기", "Quick actions")}</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {quick.map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="group inline-flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white"
              >
                {q.label}
                <ArrowUpRight
                  size={14}
                  strokeWidth={1.5}
                  className="text-white/25 transition-all group-hover:translate-x-0.5 group-hover:text-white/60"
                />
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
                className="inline-flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white disabled:opacity-40"
              >
                {minting ? t("발급 중…", "Minting…") : t("테스트 원화 발급", "Mint test KRW")}
              </button>
            ) : (
              <a
                href="https://faucet.giwa.io"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-white/70 transition-colors hover:text-white"
              >
                {t("가스 받기", "Get gas")}
                <ArrowUpRight size={14} strokeWidth={1.5} className="text-white/25" />
              </a>
            )}
          </div>
        </FadeUp>

        <p className="mt-16 border-t border-white/[0.06] pt-6 text-xs leading-relaxed text-white/25">
          {t(
            "GIWA Sepolia 테스트넷에서 동작하는 데모입니다. 납입 통화는 모의 원화(mKRW)이며 무료로 발급받을 수 있습니다.",
            "A demo on GIWA Sepolia testnet. Payments use mock KRW (mKRW), mintable for free."
          )}
        </p>
      </main>
    </div>
  );
}
