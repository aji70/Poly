"use client";

import React, { useState, useCallback } from "react";
import { useAccount, useChainId, usePublicClient, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TOURNAMENT_ESCROW_ADDRESSES } from "@/constants/contracts";
import TycoonTournamentEscrowAbi from "@/context/abi/TycoonTournamentEscrow.json";

const ESCROW_READ_FNS = [
  { name: "owner", args: [] },
  { name: "backend", args: [] },
  { name: "usdc", args: [] },
  { name: "tournaments", args: [{ name: "tournamentId", type: "number" }] },
  { name: "tournamentPool", args: [{ name: "tournamentId", type: "number" }] },
  { name: "getEntrants", args: [{ name: "tournamentId", type: "number" }] },
  { name: "entryPaid", args: [{ name: "tournamentId", type: "number" }, { name: "address", type: "address" }] },
] as const;

export default function EscrowAdminSection() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const escrowAddress = TOURNAMENT_ESCROW_ADDRESSES[chainId as keyof typeof TOURNAMENT_ESCROW_ADDRESSES];
  const [readTournamentId, setReadTournamentId] = useState("");
  const [readAddress, setReadAddress] = useState("");
  const [readResult, setReadResult] = useState<{ fn: string; result?: unknown; error?: string } | null>(null);
  const [readLoading, setReadLoading] = useState(false);
  const [writeParams, setWriteParams] = useState<Record<string, string>>({});
  const [writeResult, setWriteResult] = useState<{ fn: string; hash?: string; error?: string } | null>(null);

  const { data: owner } = useReadContract({
    address: escrowAddress ?? undefined,
    abi: TycoonTournamentEscrowAbi as never,
    functionName: "owner",
    query: { enabled: !!escrowAddress },
  });
  const { data: backend } = useReadContract({
    address: escrowAddress ?? undefined,
    abi: TycoonTournamentEscrowAbi as never,
    functionName: "backend",
    query: { enabled: !!escrowAddress },
  });

  const { writeContract, data: txHash, isPending: isWritePending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: txSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  React.useEffect(() => {
    if (writeError) setWriteResult({ fn: "write", error: writeError.message });
  }, [writeError]);

  const handleRead = useCallback(
    async (fn: string) => {
      setReadResult(null);
      setReadLoading(true);
      if (!escrowAddress || !publicClient) {
        setReadResult({ fn, error: escrowAddress ? "Wallet not connected" : "Escrow address not set" });
        setReadLoading(false);
        return;
      }
      try {
        const tid = readTournamentId ? BigInt(readTournamentId) : BigInt(0);
        const addr = (readAddress || "0x0000000000000000000000000000000000000000") as `0x${string}`;
        const abi = TycoonTournamentEscrowAbi as never;
        let result: unknown;
        if (fn === "owner" || fn === "backend" || fn === "usdc") {
          result = await publicClient.readContract({
            address: escrowAddress,
            abi,
            functionName: fn as "owner" | "backend" | "usdc",
          });
        } else if (fn === "tournaments") {
          result = await publicClient.readContract({
            address: escrowAddress,
            abi,
            functionName: "tournaments",
            args: [tid],
          });
        } else if (fn === "tournamentPool") {
          result = await publicClient.readContract({
            address: escrowAddress,
            abi,
            functionName: "tournamentPool",
            args: [tid],
          });
        } else if (fn === "getEntrants") {
          result = await publicClient.readContract({
            address: escrowAddress,
            abi,
            functionName: "getEntrants",
            args: [tid],
          });
        } else if (fn === "entryPaid") {
          result = await publicClient.readContract({
            address: escrowAddress,
            abi,
            functionName: "entryPaid",
            args: [tid, addr],
          });
        } else {
          setReadResult({ fn, error: "Unknown function" });
          setReadLoading(false);
          return;
        }
        setReadResult({ fn, result });
      } catch (e) {
        setReadResult({ fn, error: (e as Error)?.message ?? "Read failed" });
      } finally {
        setReadLoading(false);
      }
    },
    [escrowAddress, publicClient, readTournamentId, readAddress]
  );

  function handleWrite(
    fn: "createTournament" | "lockTournament" | "cancelTournament" | "setBackend" | "fundPrizePool" | "finalizeTournament" | "refundPrizeToCreator",
    ...args: (string | number | bigint | `0x${string}` | string[] | bigint[])[]
  ) {
    setWriteResult(null);
    if (!escrowAddress) {
      setWriteResult({ fn, error: "Escrow address not set" });
      return;
    }
    const normalized = args.map((a) =>
      typeof a === "string" && a.startsWith("0x") ? a as `0x${string}` : a
    );
    writeContract({
      address: escrowAddress,
      abi: TycoonTournamentEscrowAbi as never,
      functionName: fn,
      args: normalized as never[],
    });
  }

  React.useEffect(() => {
    if (txSuccess && txHash) {
      setWriteResult({ fn: "tx", hash: txHash });
    }
  }, [txSuccess, txHash]);

  if (!escrowAddress) {
    return (
      <section className="rounded-xl border border-[#00F0FF]/30 bg-[#0A1A1B]/80 p-4 backdrop-blur-sm">
        <h2 className="mb-2 font-orbitron text-lg font-semibold text-[#00F0FF]">Tournament Escrow</h2>
        <p className="text-sm text-[#B0BFC0]">
          Set <code className="rounded bg-black/40 px-1">NEXT_PUBLIC_POLYGON_TOURNAMENT_ESCROW</code> in env to manage the escrow contract.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-[#00F0FF]/30 bg-[#0A1A1B]/80 p-4 backdrop-blur-sm">
      <h2 className="mb-3 font-orbitron text-lg font-semibold text-[#00F0FF]">Tournament Escrow</h2>
      <p className="mb-3 text-xs text-[#B0BFC0]">
        Contract: <code className="break-all rounded bg-black/40 px-1">{escrowAddress}</code>
      </p>
      {!isConnected && (
        <p className="mb-4 text-amber-400 text-sm">Connect wallet (owner or backend) to call write functions.</p>
      )}

      <div className="mb-4 grid gap-2 text-sm">
        <p><span className="text-[#00F0FF]/80">Owner:</span> <code className="break-all text-emerald-400">{String(owner ?? "—")}</code></p>
        <p><span className="text-[#00F0FF]/80">Backend:</span> <code className="break-all text-emerald-400">{String(backend ?? "—")}</code></p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="text"
          placeholder="Tournament ID (for read)"
          value={readTournamentId}
          onChange={(e) => setReadTournamentId(e.target.value)}
          className="min-w-[120px] rounded border border-[#00F0FF]/30 bg-black/40 px-2 py-1.5 text-sm"
        />
        <input
          type="text"
          placeholder="Address (for entryPaid)"
          value={readAddress}
          onChange={(e) => setReadAddress(e.target.value)}
          className="min-w-[200px] rounded border border-[#00F0FF]/30 bg-black/40 px-2 py-1.5 text-sm"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {ESCROW_READ_FNS.map(({ name }) => (
          <button
            key={name}
            type="button"
            onClick={() => handleRead(name)}
            disabled={readLoading}
            className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
          >
            {name}
          </button>
        ))}
      </div>
      {readLoading && <p className="mb-2 text-xs text-amber-400">Reading…</p>}
      {readResult && (
        <div className="mb-4 overflow-x-auto rounded bg-black/40 p-2 font-mono text-sm">
          {readResult.error ? (
            <span className="text-red-400">{readResult.error}</span>
          ) : (
            <pre className="whitespace-pre-wrap break-all text-emerald-400">
              {JSON.stringify(readResult.result, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2)}
            </pre>
          )}
        </div>
      )}

      <h3 className="mb-2 text-sm font-semibold text-amber-400/90">Write (owner/backend)</h3>
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-2 rounded-lg bg-black/20 p-2">
          <span className="font-mono text-sm text-amber-400">createTournament</span>
          <input
            placeholder="tournamentId"
            value={writeParams.createTournamentId ?? ""}
            onChange={(e) => setWriteParams((p) => ({ ...p, createTournamentId: e.target.value }))}
            className="w-20 rounded border bg-black/40 px-2 py-1 text-sm"
          />
          <input
            placeholder="entryFee (USDC wei)"
            value={writeParams.createEntryFee ?? ""}
            onChange={(e) => setWriteParams((p) => ({ ...p, createEntryFee: e.target.value }))}
            className="w-32 rounded border bg-black/40 px-2 py-1 text-sm"
          />
          <input
            placeholder="creator 0x..."
            value={writeParams.createCreator ?? ""}
            onChange={(e) => setWriteParams((p) => ({ ...p, createCreator: e.target.value }))}
            className="min-w-[200px] rounded border bg-black/40 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={() =>
              handleWrite(
                "createTournament",
                BigInt(writeParams.createTournamentId || "0"),
                BigInt(writeParams.createEntryFee || "0"),
                (writeParams.createCreator || "0x0000000000000000000000000000000000000000") as `0x${string}`
              )
            }
            disabled={!isConnected || isWritePending}
            className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-500 disabled:opacity-50"
          >
            Send
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-2 rounded-lg bg-black/20 p-2">
          <span className="font-mono text-sm text-amber-400">lockTournament</span>
          <input
            placeholder="tournamentId"
            value={writeParams.lockId ?? ""}
            onChange={(e) => setWriteParams((p) => ({ ...p, lockId: e.target.value }))}
            className="w-20 rounded border bg-black/40 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={() => handleWrite("lockTournament", BigInt(writeParams.lockId || "0"))}
            disabled={!isConnected || isWritePending}
            className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-500 disabled:opacity-50"
          >
            Send
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-2 rounded-lg bg-black/20 p-2">
          <span className="font-mono text-sm text-amber-400">cancelTournament</span>
          <input
            placeholder="tournamentId"
            value={writeParams.cancelId ?? ""}
            onChange={(e) => setWriteParams((p) => ({ ...p, cancelId: e.target.value }))}
            className="w-20 rounded border bg-black/40 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={() => handleWrite("cancelTournament", BigInt(writeParams.cancelId || "0"))}
            disabled={!isConnected || isWritePending}
            className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-500 disabled:opacity-50"
          >
            Send
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-2 rounded-lg bg-black/20 p-2">
          <span className="font-mono text-sm text-amber-400">setBackend</span>
          <input
            placeholder="0x..."
            value={writeParams.setBackendAddr ?? ""}
            onChange={(e) => setWriteParams((p) => ({ ...p, setBackendAddr: e.target.value }))}
            className="min-w-[280px] rounded border bg-black/40 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={() => handleWrite("setBackend", (writeParams.setBackendAddr || "0x") as `0x${string}`)}
            disabled={!isConnected || isWritePending}
            className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-500 disabled:opacity-50"
          >
            Send
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-2 rounded-lg bg-black/20 p-2">
          <span className="font-mono text-sm text-amber-400">fundPrizePool</span>
          <input
            placeholder="tournamentId"
            value={writeParams.fundId ?? ""}
            onChange={(e) => setWriteParams((p) => ({ ...p, fundId: e.target.value }))}
            className="w-20 rounded border bg-black/40 px-2 py-1 text-sm"
          />
          <input
            placeholder="amount (USDC wei)"
            value={writeParams.fundAmount ?? ""}
            onChange={(e) => setWriteParams((p) => ({ ...p, fundAmount: e.target.value }))}
            className="w-36 rounded border bg-black/40 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={() =>
              handleWrite("fundPrizePool", BigInt(writeParams.fundId || "0"), BigInt(writeParams.fundAmount || "0"))
            }
            disabled={!isConnected || isWritePending}
            className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-500 disabled:opacity-50"
          >
            Send
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-2 rounded-lg bg-black/20 p-2">
          <span className="font-mono text-sm text-amber-400">finalizeTournament</span>
          <input
            placeholder="tournamentId"
            value={writeParams.finalizeId ?? ""}
            onChange={(e) => setWriteParams((p) => ({ ...p, finalizeId: e.target.value }))}
            className="w-20 rounded border bg-black/40 px-2 py-1 text-sm"
          />
          <input
            placeholder='recipients JSON ["0x..."]'
            value={writeParams.finalizeRecipients ?? ""}
            onChange={(e) => setWriteParams((p) => ({ ...p, finalizeRecipients: e.target.value }))}
            className="min-w-[200px] flex-1 rounded border bg-black/40 px-2 py-1 text-sm"
          />
          <input
            placeholder='amounts JSON ["1000000"]'
            value={writeParams.finalizeAmounts ?? ""}
            onChange={(e) => setWriteParams((p) => ({ ...p, finalizeAmounts: e.target.value }))}
            className="min-w-[180px] flex-1 rounded border bg-black/40 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={() => {
              try {
                const recipients = JSON.parse(writeParams.finalizeRecipients || "[]") as string[];
                const amounts = (JSON.parse(writeParams.finalizeAmounts || "[]") as string[]).map((s) => BigInt(s));
                if (recipients.length !== amounts.length) throw new Error("Length mismatch");
                handleWrite(
                  "finalizeTournament",
                  BigInt(writeParams.finalizeId || "0"),
                  recipients as `0x${string}`[],
                  amounts
                );
              } catch (e) {
                setWriteResult({ fn: "finalizeTournament", error: (e as Error)?.message ?? "Invalid JSON" });
              }
            }}
            disabled={!isConnected || isWritePending}
            className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-500 disabled:opacity-50"
          >
            Send
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-2 rounded-lg bg-black/20 p-2">
          <span className="font-mono text-sm text-amber-400">refundPrizeToCreator</span>
          <input
            placeholder="tournamentId"
            value={writeParams.refundId ?? ""}
            onChange={(e) => setWriteParams((p) => ({ ...p, refundId: e.target.value }))}
            className="w-20 rounded border bg-black/40 px-2 py-1 text-sm"
          />
          <button
            type="button"
            onClick={() => handleWrite("refundPrizeToCreator", BigInt(writeParams.refundId || "0"))}
            disabled={!isConnected || isWritePending}
            className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-500 disabled:opacity-50"
          >
            Send (owner only)
          </button>
        </div>
      </div>

      {(isWritePending || isConfirming) && (
        <p className="mt-2 text-sm text-amber-400">Transaction pending…</p>
      )}
      {writeResult?.hash && (
        <p className="mt-2 text-sm text-emerald-400">Tx: {writeResult.hash}</p>
      )}
      {writeResult?.error && (
        <p className="mt-2 text-sm text-red-400">{writeResult.error}</p>
      )}
    </section>
  );
}
