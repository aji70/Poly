"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useTournament } from "@/context/TournamentContext";
import { useGuestAuthOptional } from "@/context/GuestAuthContext";
import {
  ChevronLeft,
  Loader2,
  Swords,
  Users,
  Trophy,
  UserPlus,
  Lock,
  Play,
  AlertCircle,
} from "lucide-react";
import type { BracketRound } from "@/types/tournament";

function formatEntryFee(wei: string | number): string {
  const n = Number(wei);
  if (n === 0) return "Free";
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)} USDC`;
  return `${n} wei`;
}

function statusColor(status: string): string {
  switch (status) {
    case "REGISTRATION_OPEN":
      return "text-emerald-400";
    case "BRACKET_LOCKED":
    case "IN_PROGRESS":
      return "text-amber-400";
    case "COMPLETED":
      return "text-cyan-400";
    case "CANCELLED":
      return "text-red-400";
    default:
      return "text-white/70";
  }
}

export default function TournamentDetailPage() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const { guestUser } = useGuestAuthOptional() ?? {};
  const { address: walletAddress } = useAccount();
  const [registering, setRegistering] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const {
    tournament,
    bracket,
    leaderboard,
    detailLoading,
    detailError,
    bracketLoading,
    leaderboardLoading,
    fetchTournament,
    fetchBracket,
    fetchLeaderboard,
    registerForTournament,
    closeRegistration,
    startRound,
    isRegistered,
  } = useTournament();

  const isCreator = tournament && guestUser && tournament.creator_id === guestUser.id;
  const canRegister =
    tournament?.status === "REGISTRATION_OPEN" &&
    (guestUser != null || walletAddress != null) &&
    !isRegistered(tournament.id);

  useEffect(() => {
    if (!id) return;
    fetchTournament(id);
  }, [id, fetchTournament]);

  useEffect(() => {
    if (!id || !tournament || tournament.id !== Number(id)) return;
    if (
      tournament.status === "BRACKET_LOCKED" ||
      tournament.status === "IN_PROGRESS" ||
      tournament.status === "COMPLETED"
    ) {
      fetchBracket(id);
      fetchLeaderboard(id, tournament.status === "COMPLETED" ? "final" : "live");
    }
  }, [id, tournament?.id, tournament?.status, fetchBracket, fetchLeaderboard]);

  const handleRegister = async () => {
    if (!id || !canRegister) return;
    setRegistering(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await registerForTournament(id, {
        address: (walletAddress ?? guestUser?.address) ?? undefined,
        chain: tournament?.chain,
      });
      if (res.success) {
        setActionSuccess("Registered!");
        fetchTournament(id);
      } else {
        setActionError(res.message ?? "Registration failed");
      }
    } catch (e) {
      setActionError((e as Error)?.message ?? "Registration failed");
    } finally {
      setRegistering(false);
    }
  };

  const handleCloseRegistration = async () => {
    if (!id || !isCreator) return;
    setActionError(null);
    setActionSuccess(null);
    const res = await closeRegistration(id);
    if (res.success) {
      setActionSuccess("Registration closed. Bracket generated.");
      fetchTournament(id);
      fetchBracket(id);
    } else {
      setActionError(res.message ?? "Failed");
    }
  };

  const handleStartRound = async (roundIndex: number) => {
    if (!id || !isCreator) return;
    setActionError(null);
    setActionSuccess(null);
    const res = await startRound(id, roundIndex);
    if (res.success) {
      setActionSuccess(`Round ${roundIndex + 1} started.`);
      fetchTournament(id);
      fetchBracket(id);
    } else {
      setActionError(res.message ?? "Failed");
    }
  };

  if (detailLoading && !tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#010F10] to-[#0E1415] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (detailError && !tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#010F10] to-[#0E1415] text-white px-4 py-8">
        <p className="text-red-400 text-center">{detailError}</p>
        <Link href="/tournaments" className="block text-center text-cyan-400 mt-4">
          Back to Tournaments
        </Link>
      </div>
    );
  }

  if (!tournament || String(tournament.id) !== id) {
    return null;
  }

  const entryCount = tournament.entries?.length ?? 0;
  const nextRoundToStart =
    bracket?.rounds?.find(
      (r) => r.status === "PENDING" && r.matches?.some((m) => m.status === "PENDING" || m.status === "AWAITING_PLAYERS")
    );

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#010F10] to-[#0E1415] text-white">
      <header className="sticky top-0 z-50 flex items-center justify-between gap-4 px-4 py-4 md:px-8 border-b border-white/10 bg-[#010F10]/90 backdrop-blur-md">
        <Link
          href="/tournaments"
          className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-semibold text-sm"
        >
          <ChevronLeft className="w-5 h-5" />
          Tournaments
        </Link>
        <h1 className="text-lg md:text-xl font-bold text-cyan-400 truncate max-w-[50%]">
          {tournament.name}
        </h1>
        <div className="w-24" />
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 md:py-8 space-y-8">
        {/* Meta */}
        <section className="rounded-2xl border border-[#0E282A] bg-[#011112]/80 p-5">
          <p className={`font-medium ${statusColor(tournament.status)}`}>
            {tournament.status.replace(/_/g, " ")}
          </p>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-white/70">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {entryCount} / {tournament.max_players} players
            </span>
            <span>{formatEntryFee(tournament.entry_fee_wei)}</span>
            <span>{tournament.chain}</span>
          </div>

          {actionError && (
            <p className="mt-3 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {actionError}
            </p>
          )}
          {actionSuccess && (
            <p className="mt-3 text-emerald-400 text-sm">{actionSuccess}</p>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 mt-4">
            {canRegister && (
              <button
                type="button"
                onClick={handleRegister}
                disabled={registering}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/25 border border-cyan-500/50 text-cyan-300 font-medium hover:bg-cyan-500/35 disabled:opacity-50"
              >
                {registering ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                Register
              </button>
            )}
            {tournament.status === "REGISTRATION_OPEN" && isCreator && (
              <button
                type="button"
                onClick={handleCloseRegistration}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 font-medium hover:bg-amber-500/30"
              >
                <Lock className="w-4 h-4" />
                Close registration & generate bracket
              </button>
            )}
            {nextRoundToStart != null && isCreator && (
              <button
                type="button"
                onClick={() => handleStartRound(nextRoundToStart.round_index)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-medium hover:bg-emerald-500/30"
              >
                <Play className="w-4 h-4" />
                Start round {nextRoundToStart.round_index + 1}
              </button>
            )}
          </div>
        </section>

        {/* Bracket */}
        {(tournament.status === "BRACKET_LOCKED" ||
          tournament.status === "IN_PROGRESS" ||
          tournament.status === "COMPLETED") && (
          <section>
            <h2 className="text-lg font-semibold text-cyan-400 flex items-center gap-2 mb-4">
              <Swords className="w-5 h-5" />
              Bracket
            </h2>
            {bracketLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              </div>
            )}
            {!bracketLoading && bracket && (
              <div className="space-y-6">
                {bracket.rounds.map((r: BracketRound) => (
                  <div
                    key={r.round_index}
                    className="rounded-xl border border-[#0E282A] bg-[#011112]/60 p-4"
                  >
                    <p className="text-sm font-medium text-white/70 mb-3">
                      Round {r.round_index + 1} — {r.status}
                    </p>
                    <div className="space-y-2">
                      {r.matches?.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-black/20 text-sm"
                        >
                          <span className="truncate">
                            {m.slot_a_username ?? (m.slot_a_type === "BYE" ? "BYE" : "—")}
                          </span>
                          <span className="text-white/50">vs</span>
                          <span className="truncate">
                            {m.slot_b_username ?? (m.slot_b_type === "BYE" ? "BYE" : "—")}
                          </span>
                          {m.winner_username && (
                            <span className="text-cyan-400 text-xs">
                              Winner: {m.winner_username}
                            </span>
                          )}
                          {m.game_id && (
                            <Link
                              href={`/game-waiting?gameId=${m.game_id}`}
                              className="text-cyan-400 hover:underline text-xs"
                            >
                              Play
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Leaderboard */}
        {(tournament.status === "IN_PROGRESS" || tournament.status === "COMPLETED") && (
          <section>
            <h2 className="text-lg font-semibold text-cyan-400 flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5" />
              Leaderboard
            </h2>
            {leaderboardLoading && (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              </div>
            )}
            {!leaderboardLoading && leaderboard && (
              <div className="rounded-xl border border-[#0E282A] bg-[#011112]/60 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-white/70">
                      <th className="p-3">#</th>
                      <th className="p-3">Player</th>
                      <th className="p-3">Eliminated</th>
                      <th className="p-3">Payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.entries?.map((e) => (
                      <tr
                        key={e.entry_id}
                        className="border-b border-white/5 hover:bg-white/5"
                      >
                        <td className="p-3">{e.rank}</td>
                        <td className="p-3 font-medium">
                          {e.username}
                          {e.is_winner && (
                            <span className="ml-2 text-amber-400">Winner</span>
                          )}
                        </td>
                        <td className="p-3 text-white/60">
                          {e.eliminated_in_round != null
                            ? `Round ${e.eliminated_in_round + 1}`
                            : "—"}
                        </td>
                        <td className="p-3 text-white/60">
                          {e.payout_wei
                            ? `$${(Number(e.payout_wei) / 1e6).toFixed(2)}`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Entries (during registration) */}
        {tournament.status === "REGISTRATION_OPEN" && tournament.entries?.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-cyan-400 flex items-center gap-2 mb-4">
              <Users className="w-5 h-5" />
              Registered ({tournament.entries.length})
            </h2>
            <ul className="rounded-xl border border-[#0E282A] bg-[#011112]/60 divide-y divide-white/5">
              {tournament.entries.map((e) => (
                <li key={e.id} className="px-4 py-3 text-sm">
                  {e.username ?? e.address ?? `Entry #${e.id}`}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
