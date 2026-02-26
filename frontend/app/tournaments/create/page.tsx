"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTournament } from "@/context/TournamentContext";
import { useGuestAuthOptional } from "@/context/GuestAuthContext";
import { appChain } from "@/config";
import type { PrizeSource } from "@/types/tournament";
import { ChevronLeft, Loader2, Swords } from "lucide-react";

const PRIZE_SOURCES: { value: PrizeSource; label: string }[] = [
  { value: "NO_POOL", label: "No prize pool" },
  { value: "ENTRY_FEE_POOL", label: "Entry fee pool" },
  { value: "CREATOR_FUNDED", label: "Creator funded" },
];

export default function CreateTournamentPage() {
  const router = useRouter();
  const guestAuth = useGuestAuthOptional();
  const guestUser = guestAuth?.guestUser ?? null;
  const authLoading = guestAuth?.isLoading ?? false;
  const { createTournament } = useTournament();

  const [name, setName] = useState("");
  const chain = appChain ?? "POLYGON";
  const [prizeSource, setPrizeSource] = useState<PrizeSource>("NO_POOL");
  const [maxPlayers, setMaxPlayers] = useState(32);
  const [minPlayers, setMinPlayers] = useState(2);
  const [entryFeeWei, setEntryFeeWei] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!guestUser) {
      setError("You must be logged in to create a tournament");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body: Parameters<typeof createTournament>[0] = {
        name: name.trim(),
        chain,
        prize_source: prizeSource,
        max_players: Math.min(256, Math.max(2, maxPlayers)),
        min_players: Math.max(2, Math.min(maxPlayers, minPlayers)),
      };
      if (prizeSource === "ENTRY_FEE_POOL") {
        const fee = entryFeeWei ? String(BigInt(entryFeeWei)) : "0";
        body.entry_fee_wei = Number(fee) || 0;
      }
      const created = await createTournament(body);
      const raw = created && typeof created === "object" ? (created as Record<string, unknown>) : null;
      const id = raw?.id != null ? raw.id : (raw?.data as { id?: number } | undefined)?.id;
      if (id != null) {
        router.push(`/tournaments/${String(id)}`);
        return;
      }
      setError(created ? "Invalid response from server" : "Failed to create tournament");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response
          ?.data?.message ||
        (err as Error)?.message ||
        "Failed to create tournament";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#010F10] to-[#0E1415] text-white">
      <header className="sticky top-0 z-50 flex items-center gap-4 px-4 py-4 md:px-8 border-b border-white/10 bg-[#010F10]/90 backdrop-blur-md">
        <Link
          href="/tournaments"
          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-semibold text-sm"
        >
          <ChevronLeft className="w-5 h-5" />
          Tournaments
        </Link>
        <h1 className="text-xl md:text-2xl font-bold text-cyan-400 flex items-center gap-2">
          <Swords className="w-6 h-6 text-cyan-400" />
          Create tournament
        </h1>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8">
        {authLoading && (
          <p className="text-cyan-400/80 text-center py-4">Checking sign-in…</p>
        )}
        {!authLoading && !guestUser && (
          <p className="text-amber-400 text-center py-4">
            Sign in (guest or with wallet) to create a tournament.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-white/80 mb-1">
              Tournament name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Weekend Cup"
              className="w-full px-4 py-3 rounded-xl bg-[#011112] border border-[#0E282A] text-white placeholder-white/40 focus:border-cyan-500/50 focus:outline-none"
              maxLength={200}
            />
          </div>

          <p className="text-sm text-white/60">Chain: {chain}</p>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              Prize source
            </label>
            <div className="space-y-2">
              {PRIZE_SOURCES.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="prize_source"
                    value={value}
                    checked={prizeSource === value}
                    onChange={() => setPrizeSource(value)}
                    className="text-cyan-500 focus:ring-cyan-500"
                  />
                  <span className="text-white/90">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="max_players" className="block text-sm font-medium text-white/80 mb-1">
                Max players
              </label>
              <input
                id="max_players"
                type="number"
                min={2}
                max={256}
                value={maxPlayers}
                onChange={(e) => setMaxPlayers(Number(e.target.value) || 32)}
                className="w-full px-4 py-3 rounded-xl bg-[#011112] border border-[#0E282A] text-white focus:border-cyan-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="min_players" className="block text-sm font-medium text-white/80 mb-1">
                Min players
              </label>
              <input
                id="min_players"
                type="number"
                min={2}
                max={maxPlayers}
                value={minPlayers}
                onChange={(e) => setMinPlayers(Number(e.target.value) || 2)}
                className="w-full px-4 py-3 rounded-xl bg-[#011112] border border-[#0E282A] text-white focus:border-cyan-500/50 focus:outline-none"
              />
            </div>
          </div>

          {prizeSource === "ENTRY_FEE_POOL" && (
            <div>
              <label htmlFor="entry_fee" className="block text-sm font-medium text-white/80 mb-1">
                Entry fee (USDC wei, 6 decimals e.g. 1000000 = $1)
              </label>
              <input
                id="entry_fee"
                type="text"
                value={entryFeeWei}
                onChange={(e) => setEntryFeeWei(e.target.value.replace(/\D/g, ""))}
                placeholder="0 for free"
                className="w-full px-4 py-3 rounded-xl bg-[#011112] border border-[#0E282A] text-white placeholder-white/40 focus:border-cyan-500/50 focus:outline-none"
              />
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-cyan-500/25 border border-cyan-500/50 text-cyan-300 font-semibold hover:bg-cyan-500/35 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Create tournament"
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
