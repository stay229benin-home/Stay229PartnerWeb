"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    createSupabaseClient,
    generatePromoCode,
    isValidCustomPromoCode,
    normalizePromoCode,
    PROMO_PLATFORMS,
    type PartnerPromoCode,
} from "@/lib/supabase";

/**
 * Page de gestion des codes promo personnalisés.
 *
 * - Liste tous les codes du partenaire (depuis la table partner_promo_codes
 *   créée par la migration 0017). Le code "principal" — celui posé sur la
 *   ligne `partners.promo_code` — est aussi présent (synchronisé par
 *   trigger SQL `trg_sync_primary_promo_code`).
 * - Permet de créer un nouveau code, soit auto-généré soit personnalisé,
 *   avec deux champs facultatifs : plateforme (Instagram / TikTok / …) et
 *   URL du profil sur la plateforme.
 * - Permet d'activer / désactiver un code, et de le supprimer (sauf le
 *   principal qui est protégé).
 *
 * RLS de 0017 garantit qu'un partenaire ne voit/modifie QUE ses propres
 * lignes. Pas de filtrage côté client requis.
 */

type PartnerRow = {
    id: string;
    promo_code: string;
};

export default function PromoCodesPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [partner, setPartner] = useState<PartnerRow | null>(null);
    const [codes, setCodes] = useState<PartnerPromoCode[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Formulaire de création
    const [form, setForm] = useState({
        mode: "auto" as "auto" | "custom",
        customCode: "",
        platform: "",
        platformOther: "",
        profileUrl: "",
        label: "",
    });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [createSuccess, setCreateSuccess] = useState<string | null>(null);

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
                router.replace("/login?next=/promo-codes");
                return;
            }

            const { data: p, error: pErr } = await supabase
                .from("partners")
                .select("id, promo_code")
                .eq("auth_user_id", user.id)
                .maybeSingle();
            if (pErr) throw pErr;
            if (!p) {
                router.replace("/complete");
                return;
            }
            setPartner(p as PartnerRow);

            const { data: list, error: lErr } = await supabase
                .from("partner_promo_codes")
                .select(
                    "id, partner_id, code, platform, profile_url, label, is_active, created_at",
                )
                .eq("partner_id", p.id)
                .order("created_at", { ascending: true });
            if (lErr) throw lErr;
            setCodes((list ?? []) as PartnerPromoCode[]);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur de chargement.");
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        if (!partner) return;
        setCreateError(null);
        setCreateSuccess(null);

        let code: string;
        if (form.mode === "auto") {
            code = generatePromoCode();
        } else {
            code = normalizePromoCode(form.customCode);
            if (!isValidCustomPromoCode(code)) {
                setCreateError(
                    "Le code doit faire entre 5 et 15 caractères, majuscules et chiffres uniquement, sans 0, O, 1, I ou L (pour éviter les confusions).",
                );
                return;
            }
        }

        const platform =
            form.platform === "Autre"
                ? form.platformOther.trim() || null
                : form.platform.trim() || null;
        const profileUrl = form.profileUrl.trim() || null;
        const label = form.label.trim() || null;

        // Validation URL légère
        if (profileUrl && !/^https?:\/\//.test(profileUrl)) {
            setCreateError(
                "L'URL du profil doit commencer par http:// ou https://.",
            );
            return;
        }

        setCreating(true);
        try {
            const supabase = createSupabaseClient();
            const { error: insErr } = await supabase
                .from("partner_promo_codes")
                .insert({
                    partner_id: partner.id,
                    code,
                    platform,
                    profile_url: profileUrl,
                    label,
                });
            if (insErr) {
                if (
                    /duplicate|unique|already exists/i.test(insErr.message)
                ) {
                    setCreateError(
                        form.mode === "custom"
                            ? "Ce code est déjà pris. Essayez-en un autre."
                            : "Collision improbable rencontrée. Réessayez.",
                    );
                } else {
                    setCreateError(insErr.message);
                }
                return;
            }
            setCreateSuccess(`Code créé : ${code}`);
            setForm({
                mode: "auto",
                customCode: "",
                platform: "",
                platformOther: "",
                profileUrl: "",
                label: "",
            });
            await load();
        } catch (e) {
            setCreateError(
                e instanceof Error ? e.message : "Erreur lors de la création.",
            );
        } finally {
            setCreating(false);
        }
    }

    async function toggleActive(row: PartnerPromoCode) {
        if (!partner) return;
        // On empêche de désactiver le code principal (sécurité UX).
        if (row.code === partner.promo_code) {
            return;
        }
        const supabase = createSupabaseClient();
        const { error: e } = await supabase
            .from("partner_promo_codes")
            .update({ is_active: !row.is_active })
            .eq("id", row.id);
        if (!e) await load();
    }

    async function deleteCode(row: PartnerPromoCode) {
        if (!partner) return;
        if (row.code === partner.promo_code) return;
        if (!confirm(`Supprimer définitivement le code ${row.code} ?`)) return;
        const supabase = createSupabaseClient();
        const { error: e } = await supabase
            .from("partner_promo_codes")
            .delete()
            .eq("id", row.id);
        if (!e) await load();
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
                <p className="text-red-400 text-sm">{error}</p>
            </main>
        );
    }
    if (!partner) return null;

    return (
        <main className="min-h-screen px-4 sm:px-6 py-8 max-w-3xl mx-auto">
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-white">
                    Vos codes promo
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                    Créez autant de codes que vous voulez. Vous pouvez en avoir
                    un par plateforme (Instagram, TikTok, WhatsApp…) ou un par
                    campagne, pour suivre ce qui marche le mieux. Tous les
                    codes que vous créez ici comptent pour vos commissions.
                </p>
            </header>

            {/* Liste */}
            <section className="space-y-3 mb-10">
                {codes.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                        Aucun code pour l'instant.
                    </p>
                ) : (
                    codes.map((c) => {
                        const isPrimary = c.code === partner.promo_code;
                        return (
                            <div
                                key={c.id}
                                className={`rounded-xl border p-4 ${
                                    c.is_active
                                        ? "border-brand-cyan/30 bg-brand-badge/40"
                                        : "border-gray-800 bg-brand-badge/20 opacity-60"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-mono text-xl font-bold tracking-wider text-brand-cyanLight">
                                                {c.code}
                                            </span>
                                            {isPrimary && (
                                                <span className="text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 bg-brand-cyan/20 text-brand-cyanLight">
                                                    Principal
                                                </span>
                                            )}
                                            {!c.is_active && (
                                                <span className="text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 bg-gray-700 text-gray-300">
                                                    Désactivé
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                                            {c.label && <p>{c.label}</p>}
                                            {c.platform && (
                                                <p>
                                                    Plateforme :{" "}
                                                    <span className="text-gray-200">
                                                        {c.platform}
                                                    </span>
                                                </p>
                                            )}
                                            {c.profile_url && (
                                                <p className="truncate max-w-xs">
                                                    Profil :{" "}
                                                    <a
                                                        href={c.profile_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-brand-cyan hover:underline"
                                                    >
                                                        {c.profile_url}
                                                    </a>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        {!isPrimary && (
                                            <>
                                                <button
                                                    onClick={() =>
                                                        toggleActive(c)
                                                    }
                                                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-white/5"
                                                >
                                                    {c.is_active
                                                        ? "Désactiver"
                                                        : "Réactiver"}
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        deleteCode(c)
                                                    }
                                                    className="text-xs px-3 py-1.5 rounded-lg border border-red-500/40 text-red-300 hover:bg-red-500/10"
                                                >
                                                    Supprimer
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </section>

            {/* Formulaire de création */}
            <section className="border-t border-gray-800 pt-6">
                <h2 className="text-lg font-semibold text-white mb-3">
                    Créer un nouveau code
                </h2>
                <form onSubmit={handleCreate} className="space-y-3">
                    <div className="flex gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() =>
                                setForm((f) => ({ ...f, mode: "auto" }))
                            }
                            className={`px-3 py-1.5 rounded-lg text-sm ${
                                form.mode === "auto"
                                    ? "bg-brand-cyan text-black font-semibold"
                                    : "border border-gray-700 text-gray-300"
                            }`}
                        >
                            Générer automatiquement
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                setForm((f) => ({ ...f, mode: "custom" }))
                            }
                            className={`px-3 py-1.5 rounded-lg text-sm ${
                                form.mode === "custom"
                                    ? "bg-brand-cyan text-black font-semibold"
                                    : "border border-gray-700 text-gray-300"
                            }`}
                        >
                            Choisir mon code
                        </button>
                    </div>

                    {form.mode === "custom" && (
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">
                                Code personnalisé
                            </label>
                            <input
                                type="text"
                                value={form.customCode}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        customCode: e.target.value.toUpperCase(),
                                    }))
                                }
                                placeholder="Ex : JEAN229"
                                className="w-full rounded-lg bg-brand-badge border border-gray-700 px-3 py-2 text-white font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                                maxLength={15}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Entre 5 et 15 caractères. Majuscules et chiffres
                                uniquement. Évitez 0, O, 1, I et L pour ne pas
                                que vos filleuls se trompent à la saisie.
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm text-gray-300 mb-1">
                            Plateforme (facultatif)
                        </label>
                        <select
                            value={form.platform}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    platform: e.target.value,
                                }))
                            }
                            className="w-full rounded-lg bg-brand-badge border border-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                        >
                            <option value="">— Aucune —</option>
                            {PROMO_PLATFORMS.map((p) => (
                                <option key={p} value={p}>
                                    {p}
                                </option>
                            ))}
                        </select>
                    </div>

                    {form.platform === "Autre" && (
                        <div>
                            <label className="block text-sm text-gray-300 mb-1">
                                Précisez la plateforme
                            </label>
                            <input
                                type="text"
                                value={form.platformOther}
                                onChange={(e) =>
                                    setForm((f) => ({
                                        ...f,
                                        platformOther: e.target.value,
                                    }))
                                }
                                className="w-full rounded-lg bg-brand-badge border border-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm text-gray-300 mb-1">
                            URL de votre profil (facultatif)
                        </label>
                        <input
                            type="url"
                            value={form.profileUrl}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    profileUrl: e.target.value,
                                }))
                            }
                            placeholder="https://instagram.com/votre_compte"
                            className="w-full rounded-lg bg-brand-badge border border-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Permet à l'équipe Stay229 de vérifier votre
                            audience si besoin (anti-fraude).
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-300 mb-1">
                            Libellé interne (facultatif)
                        </label>
                        <input
                            type="text"
                            value={form.label}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    label: e.target.value,
                                }))
                            }
                            placeholder="Ex : Campagne rentrée 2026"
                            className="w-full rounded-lg bg-brand-badge border border-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                        />
                    </div>

                    {createError && (
                        <p className="text-sm text-red-400">{createError}</p>
                    )}
                    {createSuccess && (
                        <p className="text-sm text-brand-cyanLight">
                            {createSuccess}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={creating}
                        className="w-full rounded-xl bg-brand-cyan text-black font-semibold py-3 hover:opacity-90 disabled:opacity-50 transition"
                    >
                        {creating ? "Création…" : "Créer ce code"}
                    </button>
                </form>
            </section>

            <footer className="mt-12 text-center">
                <Link
                    href="/dashboard"
                    className="text-sm text-gray-400 hover:text-white"
                >
                    ← Retour au tableau de bord
                </Link>
            </footer>
        </main>
    );
}
