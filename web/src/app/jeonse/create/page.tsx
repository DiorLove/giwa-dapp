"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { parseUnits, decodeEventLog, isAddress, maxUint256 } from "viem";
import {
  JEONSE_FACTORY_ADDRESS,
  MOCKKRW_ADDRESS,
  errMsg,
  fmtKRW,
  jeonseAbi,
  jeonseFactoryAbi,
  mockKrwAbi,
  onlyDigits,
  withCommas,
} from "@/lib/contracts";
import { AppNav } from "@/components/AppNav";
import { InfoTip } from "@/components/InfoTip";
import { FadeUp } from "@/components/Motion";
import { useLang } from "@/lib/i18n";

export default function JeonseCreate() {
  const { t } = useLang();
  const router = useRouter();
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [tenantIn, setTenantIn] = useState("");
  const [tenantOut, setTenantOut] = useState("");
  const [jeonse, setJeonse] = useState("");
  const [refund, setRefund] = useState("");
  const [settleDate, setSettleDate] = useState("");
  const [demo10min, setDemo10min] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 집주인 지갑의 mKRW 잔고 — 역전세 부족분을 지갑에서 바로 채울 수 있는지 판단
  const { data: krwBalRaw } = useReadContract({
    address: MOCKKRW_ADDRESS,
    abi: mockKrwAbi,
    functionName: "balanceOf",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!address, refetchInterval: 5000 },
  });
  const krwBal = (krwBalRaw as bigint | undefined) ?? 0n;

  const dateInFuture =
    demo10min ||
    (!!settleDate && new Date(settleDate).getTime() > Date.now() + 60_000);
  const valid =
    isAddress(tenantIn) &&
    isAddress(tenantOut) &&
    Number(jeonse) > 0 &&
    Number(refund) >= 0 &&
    dateInFuture;

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const ts = demo10min
        ? BigInt(Math.floor(Date.now() / 1000) + 600)
        : BigInt(Math.floor(new Date(settleDate).getTime() / 1000));
      if (!demo10min && Number(ts) * 1000 <= Date.now() + 60_000) {
        setError(
          t(
            "정산일이 과거이거나 너무 가깝습니다. 미래 시각을 선택해 주세요.",
            "Settlement date is in the past or too soon. Pick a future time."
          )
        );
        setBusy(false);
        return;
      }
      const args = [
        tenantIn as `0x${string}`,
        tenantOut as `0x${string}`,
        parseUnits(jeonse, 18),
        parseUnits(refund, 18),
        ts,
      ] as const;
      // 사전 시뮬레이션: 리버트 사유를 가스 오류 대신 그대로 노출
      await publicClient!.simulateContract({
        account: address,
        address: JEONSE_FACTORY_ADDRESS,
        abi: jeonseFactoryAbi,
        functionName: "createEscrow",
        args,
      });
      const hash = await writeContractAsync({
        address: JEONSE_FACTORY_ADDRESS,
        abi: jeonseFactoryAbi,
        functionName: "createEscrow",
        args,
      });
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      let escrowAddr: `0x${string}` | null = null;
      for (const log of receipt.logs) {
        try {
          const ev = decodeEventLog({ abi: jeonseFactoryAbi, ...log });
          if (ev.eventName === "EscrowCreated") {
            escrowAddr = (ev.args as { escrow: `0x${string}` }).escrow;
            break;
          }
        } catch {}
      }

      // 역전세: 개설 직후 집주인 지갑에서 부족분을 에스크로에 채운다 (한 흐름으로)
      if (escrowAddr && shortfallWei > 0n) {
        const allowance = (await publicClient!.readContract({
          address: MOCKKRW_ADDRESS,
          abi: mockKrwAbi,
          functionName: "allowance",
          args: [address!, escrowAddr],
        })) as bigint;
        if (allowance < shortfallWei) {
          const ah = await writeContractAsync({
            address: MOCKKRW_ADDRESS,
            abi: mockKrwAbi,
            functionName: "approve",
            args: [escrowAddr, maxUint256],
          });
          await publicClient!.waitForTransactionReceipt({ hash: ah });
        }
        const ch = await writeContractAsync({
          address: escrowAddr,
          abi: jeonseAbi,
          functionName: "coverShortfall",
        });
        await publicClient!.waitForTransactionReceipt({ hash: ch });
      }

      router.push(escrowAddr ? `/jeonse/${escrowAddr}` : "/jeonse");
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const label = "text-xs uppercase tracking-[0.15em] text-white/35";
  const input =
    "h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition-colors [color-scheme:dark] placeholder:text-white/25 focus:border-white/30";
  const jeonseN = Number(jeonse || 0);
  const refundN = Number(refund || 0);
  const landlordDiff = Math.max(jeonseN - refundN, 0);
  // 역전세: 반환할 기존 보증금이 신규 전세금보다 커서 집주인이 부족분을 메꿔야 하는 경우
  const shortfall = Math.max(refundN - jeonseN, 0);
  const isReverse = shortfall > 0;
  const toWei = (s: string) => {
    try {
      return parseUnits(s || "0", 18);
    } catch {
      return 0n;
    }
  };
  const shortfallWei = (() => {
    const j = toWei(jeonse);
    const r = toWei(refund);
    return r > j ? r - j : 0n;
  })();
  // 지갑에 부족분만큼 mKRW가 있으면 지갑에서 바로 채워 개설, 없으면 대출 안내
  const hasFundsForShortfall = krwBal >= shortfallWei;

  return (
    <div className="min-h-screen bg-black">
      <AppNav />
      <main className="mx-auto max-w-6xl px-4 pb-24 md:px-6">
        <FadeUp className="pt-12 pb-10">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/35">New Escrow</p>
          <h1 className="font-display text-4xl tracking-tight text-white md:text-5xl">
            {t("전세 에스크로 개설", "Create Jeonse Escrow")}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/40">
            {t(
              "집주인이 개설합니다. 신규 세입자가 전세금을 락하면, 정산일에 기존 세입자 보증금 반환과 집주인 차액 수령이 한 트랜잭션으로 동시에 실행됩니다.",
              "Opened by the landlord. Once the incoming tenant locks the deposit, the outgoing tenant's refund and the landlord's balance execute simultaneously in one transaction on settlement day."
            )}
          </p>
        </FadeUp>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
          <FadeUp delay={0.08} className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <span className={label}>{t("신규 세입자 주소 — 전세금을 납입할 사람", "Incoming tenant address — pays the deposit")}</span>
              <input
                value={tenantIn}
                onChange={(e) => setTenantIn(e.target.value.trim())}
                placeholder="0x…"
                suppressHydrationWarning
                className={`${input} font-mono`}
              />
            </div>
            <div className="flex flex-col gap-3">
              <span className={label}>{t("기존 세입자 주소 — 보증금을 돌려받을 사람", "Outgoing tenant address — receives the refund")}</span>
              <input
                value={tenantOut}
                onChange={(e) => setTenantOut(e.target.value.trim())}
                placeholder="0x…"
                suppressHydrationWarning
                className={`${input} font-mono`}
              />
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-3">
                <span className={label}>{t("신규 전세금", "New jeonse deposit")}</span>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={withCommas(jeonse)}
                    onChange={(e) => setJeonse(onlyDigits(e.target.value))}
                    placeholder={t("예) 300,000,000", "e.g. 300,000,000")}
                    className={`${input} pr-16`}
                  />
                  <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs text-white/35">
                    mKRW
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <span className={label}>{t("반환할 기존 보증금", "Old deposit to refund")}</span>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={withCommas(refund)}
                    onChange={(e) => setRefund(onlyDigits(e.target.value))}
                    placeholder={t("예) 280,000,000", "e.g. 280,000,000")}
                    className={`${input} pr-16`}
                  />
                  <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs text-white/35">
                    mKRW
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <span className={`flex items-center gap-1.5 ${label}`}>
                {t("정산일 (입주일)", "Settlement date (move-in day)")}
                <InfoTip
                  text={t(
                    "이 시각이 지나면 누구나 정산을 실행할 수 있고, 보증금 반환과 잔금 지급이 동시에 확정됩니다. 보통 이사(입주) 날짜로 설정해요.",
                    "After this time, anyone can trigger settlement — refund and balance finalize together. Usually set to the move-in date."
                  )}
                />
              </span>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={() => setDemo10min(true)}
                  className={`pressable rounded-xl border px-5 py-3 text-sm transition-colors ${
                    demo10min
                      ? "border-white/40 bg-white/[0.06] text-white"
                      : "border-white/10 text-white/50 hover:border-white/20"
                  }`}
                >
                  {t("10분 뒤 — 데모용", "In 10 minutes — demo")}
                </button>
                <input
                  type="datetime-local"
                  value={settleDate}
                  onChange={(e) => {
                    setSettleDate(e.target.value);
                    setDemo10min(false);
                  }}
                  className={`${input} sm:flex-1 ${demo10min ? "opacity-40" : ""}`}
                />
              </div>
              {!demo10min && settleDate && !dateInFuture && (
                <span className="text-xs text-amber-300">
                  {t(
                    "정산일은 미래 시각이어야 합니다.",
                    "Settlement date must be in the future."
                  )}
                </span>
              )}
            </div>
            {error && (
              <p className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-xs leading-relaxed break-words text-red-300">
                {error}
              </p>
            )}
          </FadeUp>

          <FadeUp
            delay={0.16}
            className="h-fit rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 md:p-8 lg:sticky lg:top-24"
          >
            <p className={label}>{t("정산 구조", "Settlement structure")}</p>
            <dl className="mt-6 flex flex-col gap-4 border-b border-white/[0.06] pb-6">
              <div className="flex items-baseline justify-between">
                <dt className="text-sm text-white/40">{t("신규 세입자 락", "Incoming tenant locks")}</dt>
                <dd className="text-xl font-medium text-white tabular-nums">
                  ₩{Number(jeonse || 0).toLocaleString("ko-KR")}
                </dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-sm text-white/40">{t("기존 세입자 반환", "Outgoing tenant refund")}</dt>
                <dd className="text-sm text-white/70 tabular-nums">
                  ₩{Number(refund || 0).toLocaleString("ko-KR")}
                </dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-sm text-white/40">
                  {isReverse ? t("집주인 부족분 (역전세)", "Landlord shortfall (reverse)") : t("집주인 차액 수령", "Landlord receives balance")}
                </dt>
                <dd className={`text-sm tabular-nums ${isReverse ? "text-amber-300" : "text-white/70"}`}>
                  {isReverse ? "−" : ""}₩{(isReverse ? shortfall : landlordDiff).toLocaleString("ko-KR")}
                </dd>
              </div>
            </dl>

            {isReverse ? (
              hasFundsForShortfall ? (
                <>
                  {/* 역전세 + 지갑에 부족분 있음: 개설과 동시에 지갑에서 부족분을 채운다 */}
                  <div className="mt-6 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="text-sm font-medium text-white/80">
                      {t("역전세 — 부족분을 지갑에서 채웁니다", "Reverse-jeonse — funded from your wallet")}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-white/50">
                      {t(
                        `반환 보증금이 신규 전세금보다 ₩${shortfall.toLocaleString("ko-KR")} 큽니다. 개설과 동시에 지갑에서 ₩${shortfall.toLocaleString("ko-KR")}이 에스크로로 들어가, 정산일에 기존 세입자에게 보증금 전액이 반환됩니다.`,
                        `The refund exceeds the new deposit by ₩${shortfall.toLocaleString("ko-KR")}. On creation, ₩${shortfall.toLocaleString("ko-KR")} moves from your wallet into the escrow, so the outgoing tenant is refunded in full at settlement.`
                      )}
                    </p>
                  </div>
                  <button
                    onClick={create}
                    disabled={busy || !valid}
                    className="pressable mt-4 h-12 w-full rounded-full bg-white text-sm font-semibold text-black disabled:opacity-40"
                  >
                    {busy
                      ? t("개설 중", "Creating")
                      : t(`개설 + 부족분 ₩${shortfall.toLocaleString("ko-KR")} 채우기`, `Create + cover ₩${shortfall.toLocaleString("ko-KR")}`)}
                  </button>
                  <p className="mt-3 text-xs leading-relaxed text-white/30">
                    {t(
                      "지갑 잔액에서 부족분이 빠져나갑니다. 개설 후 신규 세입자가 전세금을 락하면 정산 준비가 끝납니다.",
                      "The shortfall leaves your wallet balance. Once the incoming tenant locks the deposit, it's ready to settle."
                    )}
                  </p>
                </>
              ) : (
                <>
                  {/* 역전세 + 지갑 잔액 부족: 이음 Earn에서 대출로 채우도록 안내 */}
                  <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-4">
                    <p className="text-sm font-medium text-amber-200">
                      {t("역전세 — 지갑 잔액이 부족해요", "Reverse-jeonse — wallet balance short")}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-white/50">
                      {t(
                        `부족분은 ₩${shortfall.toLocaleString("ko-KR")}인데 지갑 잔액은 ${fmtKRW(krwBal)}입니다. 이음 Earn에서 담보 대출로 부족분을 마련해 지갑을 채운 뒤 다시 개설하세요.`,
                        `The shortfall is ₩${shortfall.toLocaleString("ko-KR")} but your wallet holds ${fmtKRW(krwBal)}. Borrow it from IEUM Earn against collateral to top up, then come back to create.`
                      )}
                    </p>
                    <Link
                      href="/earn"
                      className="pressable mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-black"
                    >
                      <TrendingUp size={16} strokeWidth={1.8} />
                      {t(`이음 Earn에서 ₩${shortfall.toLocaleString("ko-KR")} 대출받기`, `Borrow ₩${shortfall.toLocaleString("ko-KR")} on IEUM Earn`)}
                      <ArrowUpRight size={15} strokeWidth={1.8} className="opacity-60" />
                    </Link>
                  </div>
                  <p className="mt-4 text-xs leading-relaxed text-white/30">
                    {t(
                      "지갑에 부족분이 채워지면 이 카드가 바로 개설 버튼으로 바뀝니다.",
                      "Once your wallet holds the shortfall, this turns into the create action."
                    )}
                  </p>
                </>
              )
            ) : (
              <>
                <button
                  onClick={create}
                  disabled={busy || !valid}
                  className="pressable mt-6 h-12 w-full rounded-full bg-white text-sm font-semibold text-black disabled:opacity-40"
                >
                  {busy ? t("개설 중", "Creating") : t("에스크로 개설", "Create Escrow")}
                </button>
                <p className="mt-4 text-xs leading-relaxed text-white/30">
                  {t(
                    "세 당사자의 몫은 정산일에 하나의 트랜잭션으로 동시에 확정됩니다. 돈이 사람 손을 거치지 않습니다.",
                    "All three parties' shares settle simultaneously in one transaction. Money never passes through human hands."
                  )}
                </p>
              </>
            )}
          </FadeUp>
        </div>
      </main>
    </div>
  );
}
