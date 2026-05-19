"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";

/**
 * Dashboard partenaire — affichage des commissions, du niveau actuel, et
 * du statut de retrait.
 *
 * Sources de données (vues exposées par la migration 0017) :
 *   - `partner_commission_totals` : 1 ligne avec totaux + niveau +
 *     commission_rate / commission_cap / commission_ends_at + can_withdraw.
 *   - `partner_commissions`        : 1 ligne par booking confirmé d'un filleul.
 *
 * RLS garantit qu'un partenaire ne voit QUE ses propres données. Pas de
 * filtrage côté client requis.
 *
 * Règles affichées (migration 0017 du 2026-05-19) :
 *   - Commission COURT séjour : 3 % du total, plafonné à 700 F (varie selon
 *     niveau : 3.5 % / 850 F au niveau 4, 4 % / 1000 F au niveau Gold).
 *   - Durée payée : 4 / 6 / 9 / 12 mois selon niveau, à vie au Gold,
 *     décomptée depuis la 1ʳᵉ réservation confirmée parmi vos filleuls.
 *   - Retrait possible si ≥ 3 filleuls liés ET ≥ 2 500 F XOF cumulés.
 */

type Totals = {
    partner_id: string;
    prenom: string | null;
    nom: string | null;
    promo_code: string;
    whatsapp: string | null;
    momo_phone: string | null;
    affiliated_count: number;
    confirmed_filleul_count: number;
    partner_level: number;
    commission_rate: number;
    commission_cap: number;
    first_commission_booking_at: string | null;
    commission_ends_at: string | null;
    short_stay_total: number;
    long_stay_total: number;
    grand_total: number;
    can_withdraw: boolean;
};

type CommissionLine = {
    booking_id: string;
    kind: "short" | "long" | "unknown";
    booking_at: string;
    total_price: number;
    contact_code: string | null;
    commission_xof: number;
    partner_level: number;
};

const LEVEL_TABLE = [
    { level: 1, min: 1, max: 5, label: "Niveau 1", durationMonths: 4 },
    { level: 2, min: 6, max: 14, label: "Niveau 2", durationMonths: 6 },
    { level: 3, min: 15, max: 29, label: "Niveau 3", durationMonths: 9 },
    { level: 4, min: 30, max: 49, label: "Niveau 4", durationMonths: 12 },
    { level: 5, min: 50, max: Infinity, label: "Gold", durationMonths: null },
] as const;

export default function DashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [totals, setTotals] = useState<Totals | null>(null);
    const [lines, setLines] = useState<CommissionLine[]>([]);

    useEffect(() => {
        void load();
    }, []);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const supabase = createSupabaseClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) {
                router.replace("/login");
                return;
            }

            const { data: tot, error: totErr } = await supabase
                .from("partner_commission_totals")
                .select("*")
                .eq("auth_user_id", user.id)
                .maybeSingle();
            if (totErr) throw totErr;
            if (!tot) {
                router.replace("/complete");
                return;
            }
            setTotals(tot as Totals);

            // On charge UNIQUEMENT les lignes "short" (les LS ont
            // commission = 0 par design).
            const { data: detail, error: detErr } = await supabase
                .from("partner_commissions")
                .select(
                    "booking_id, kind, booking_at, total_price, contact_code, commission_xof, partner_level",
                )
                .eq("kind", "short")
                .order("booking_at", { ascending: false })
                .limit(100);
            if (detErr) throw detErr;
            setLines((detail ?? []) as CommissionLine[]);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur de chargement.");
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <p className="text-gray-400">Chargement…</p>
            </main>
        );
    }
    if (error) {
        return (
            <main className="min-h-screen flex items-center justify-center px-6">
                <div className="max-w-sm w-full text-center space-y-4">
                    <p className="text-red-400">{error}</p>
                    <Link
                        href="/signup"
                        className="inline-block rounded-lg px-4 py-2 bg-brand-cyan text-black font-semibold"
                    >
                        S'inscrire
                    </Link>
                </div>
            </main>
        );
    }
    if (!totals) return null;

    const currentLevel =
        LEVEL_TABLE.find((l) => l.level === totals.partner_level) ??
        LEVEL_TABLE[0];
    const nextLevel = LEVEL_TABLE.find(
        (l) => l.level === totals.partner_level + 1,
    );
    const filleulsToNext = nextLevel
        ? Math.max(0, nextLevel.min - totals.confirmed_filleul_count)
        : 0;

    return (
        <main className="min-h-screen px-4 sm:px-6 py-8 max-w-3xl mx-auto">
            <p className="text-sm text-gray-400 mb-1">
                Bonjour {totals.prenom ?? ""} {totals.nom ?? ""}
            </p>

            {/* Bandeau niveau */}
            <section className="mt-2 mb-6 rounded-2xl border border-brand-cyan/30 bg-brand-badge/40 p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-gray-400">
                            Votre niveau actuel
                        </p>
                        <p
                            className={`text-2xl sm:text-3xl font-bold mt-1 ${
                                currentLevel.level === 5
                                    ? "text-yellow-300"
                                    : "text-brand-cyanLight"
                            }`}
                        >
                            {currentLevel.label}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-400">
                            Commission
                        </p>
                        <p className="text-lg font-mono text-white">
                            {(totals.commission_rate * 100)
                                .toFixed(1)
                                .replace(/\.0$/, "")}
                            % · max {formatXof(totals.commission_cap)}
                        </p>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                        <p className="text-gray-400">Filleuls actifs</p>
                        <p className="text-white font-semibold">
                            {totals.confirmed_filleul_count}
                            {nextLevel && (
                                <span className="text-gray-400 font-normal">
                                    {" "}
                                    · plus que {filleulsToNext} pour atteindre{" "}
                                    {nextLevel.label}
                                </span>
                            )}
                            {!nextLevel && (
                                <span className="text-yellow-300 font-normal">
                                    {" "}
                                    · niveau maximum atteint
                                </span>
                            )}
                        </p>
                    </div>
                    <div>
                        <p className="text-gray-400">Fenêtre de paiement</p>
                        <p className="text-white font-semibold">
                            {renderWindow(totals)}
                        </p>
                    </div>
                </div>
            </section>

            {/* Code promo principal */}
            <section className="bg-brand-badge border border-brand-cyan/40 rounded-2xl p-6 mb-6 text-center">
                <p className="text-xs uppercase tracking-widest text-gray-400">
                    Votre code promo principal
                </p>
                <p className="text-4xl sm:text-5xl font-mono font-bold tracking-wider text-brand-cyanLight my-3">
                    {totals.promo_code}
                </p>
                <p className="text-xs text-gray-400">
                    Partagez ce code. Chaque inscription qui le mentionne vous
                    attribue le filleul, et lui offre{" "}
                    <span className="text-brand-cyanLight">
                        10 % de réduction
                    </span>{" "}
                    sur sa première réservation d'appartement.
                </p>
                <p className="text-xs text-gray-400 mt-3">
                    <Link
                        href="/promo-codes"
                        className="text-brand-cyan hover:underline"
                    >
                        Gérer mes codes promo →
                    </Link>
                </p>
            </section>

            {/* Stats cards */}
            <section className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                <StatCard
                    label="Filleuls liés"
                    value={totals.affiliated_count.toLocaleString("fr-FR")}
                />
                <StatCard
                    label="Filleuls actifs"
                    value={totals.confirmed_filleul_count.toLocaleString(
                        "fr-FR",
                    )}
                    helper="Au moins 1 résa confirmée"
                />
                <StatCard
                    label="Commission cumulée"
                    value={formatXof(totals.grand_total)}
                    helper={`${(totals.commission_rate * 100)
                        .toFixed(1)
                        .replace(
                            /\.0$/,
                            "",
                        )} %, max ${formatXof(totals.commission_cap)} / résa`}
                />
            </section>

            {/* Bloc retrait */}
            <section
                className={`mb-6 rounded-xl border p-4 text-sm ${
                    totals.can_withdraw
                        ? "border-green-500/40 bg-green-500/5"
                        : "border-gray-800 bg-brand-badge/30"
                }`}
            >
                {totals.can_withdraw ? (
                    <>
                        <p className="text-green-300 font-semibold">
                            Vous pouvez retirer.
                        </p>
                        <p className="text-gray-300 mt-1">
                            Les paiements partent chaque vendredi et chaque
                            samedi sur votre numéro Mobile Money (
                            {totals.momo_phone ?? "non renseigné"}).
                        </p>
                    </>
                ) : (
                    <>
                        <p className="text-gray-200 font-semibold">
                            Conditions de retrait
                        </p>
                        <ul className="mt-1 space-y-0.5 text-gray-400">
                            <li>
                                · Minimum 3 filleuls inscrits — vous en avez{" "}
                                <span className="text-white">
                                    {totals.affiliated_count}
                                </span>
                                .
                            </li>
                            <li>
                                · Minimum 2 500 F CFA cumulés — vous en avez{" "}
                                <span className="text-white">
                                    {formatXof(totals.grand_total)}
                                </span>
                                .
                            </li>
                            <li>
                                · Retraits effectués chaque vendredi et chaque
                                samedi.
                            </li>
                        </ul>
                    </>
                )}
            </section>

            {/* Détail */}
            <CommissionsTable
                title="Détail des réservations d'appartement"
                lines={lines}
                emptyText="Aucune commission pour l'instant. Partagez votre code promo !"
            />

            {/* Total */}
            <section className="mt-8 border-t border-gray-800 pt-4 flex items-center justify-between">
                <p className="text-lg font-semibold text-gray-300">
                    Total à percevoir
                </p>
                <p className="text-2xl font-bold text-brand-cyanLight">
                    {formatXof(totals.grand_total)}
                </p>
            </section>

            <footer className="mt-12 text-xs text-gray-500 text-center">
                Numéro Mobile Money enregistré : <br />
                <span className="text-gray-400">
                    {totals.momo_phone ?? "—"}
                </span>
            </footer>
        </main>
    );
}

function renderWindow(t: Totals): string {
    if (!t.first_commission_booking_at) {
        return "démarre à la 1ʳᵉ résa";
    }
    if (t.commission_ends_at === null) {
        return "à vie (niveau Gold)";
    }
    const end = new Date(t.commission_ends_at);
    const now = new Date();
    const closed = end.getTime() < now.getTime();
    const formatted = end.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
    return closed
        ? `terminée le ${formatted} — atteignez le niveau suivant pour la rouvrir`
        : `jusqu'au ${formatted}`;
}

function StatCard({
    label,
    value,
    helper,
}: {
    label: string;
    value: string;
    helper?: string;
}) {
    return (
        <div className="bg-brand-badge/60 border border-gray-800 rounded-xl p-4">
            <p className="text-xs uppercase tracking-wider text-gray-400">
                {label}
            </p>
            <p className="text-xl font-bold text-white mt-1">{value}</p>
            {helper && (
                <p className="text-xs text-gray-500 mt-1">{helper}</p>
            )}
        </div>
    );
}

function CommissionsTable({
    title,
    lines,
    emptyText,
}: {
    title: string;
    lines: CommissionLine[];
    emptyText: string;
}) {
    const total = lines.reduce((s, l) => s + Number(l.commission_xof), 0);
    return (
        <section>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-2">
                {title}
            </h2>
            {lines.length === 0 ? (
                <p className="text-sm text-gray-500 italic px-1">
                    {emptyText}
                </p>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-800">
                    <table className="w-full text-sm">
                        <thead className="bg-brand-badge/40 text-gray-400">
                            <tr>
                                <th className="text-left px-3 py-2">Date</th>
                                <th className="text-left px-3 py-2">Code</th>
                                <th className="text-right px-3 py-2">
                                    Montant résa
                                </th>
                                <th className="text-right px-3 py-2">
                                    Commission
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {lines.map((l) => (
                                <tr
                                    key={l.booking_id}
                                    className="border-t border-gray-800"
                                >
                                    <td className="px-3 py-2 text-gray-300">
                                        {new Date(
                                            l.booking_at,
                                        ).toLocaleDateString("fr-FR")}
                                    </td>
                                    <td className="px-3 py-2 font-mono text-gray-300">
                                        {l.contact_code ?? "—"}
                                    </td>
                                    <td className="px-3 py-2 text-right text-gray-400">
                                        {formatXof(l.total_price)}
                                    </td>
                                    <td className="px-3 py-2 text-right font-semibold text-brand-cyanLight">
                                        {formatXof(l.commission_xof)}
                                    </td>
                                </tr>
                            ))}
                            <tr className="border-t border-gray-800 bg-brand-badge/30">
                                <td
                                    colSpan={3}
                                    className="px-3 py-2 text-right font-semibold text-gray-300"
                                >
                                    Sous-total
                                </td>
                                <td className="px-3 py-2 text-right font-bold text-brand-cyanLight">
                                    {formatXof(total)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

function formatXof(n: number | string): string {
    const v = typeof n === "string" ? Number(n) : n;
    if (!Number.isFinite(v)) return "—";
    return (
        new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(v) +
        " F CFA"
    );
}
