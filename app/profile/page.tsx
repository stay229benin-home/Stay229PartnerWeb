"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";

/**
 * Page Profil — affiche les informations personnelles du partenaire :
 * prénom, nom, email. Les coordonnées WhatsApp et Mobile Money sont
 * aussi affichées en bonus puisqu'elles sont indispensables pour
 * recevoir les paiements.
 *
 * Lecture seule pour l'instant. Pour modifier ces informations, le
 * partenaire peut écrire au support.
 */

type ProfileData = {
    prenom: string | null;
    nom: string | null;
    whatsapp: string | null;
    momo_phone: string | null;
    promo_code: string;
};

export default function ProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [email, setEmail] = useState<string>("");
    const [profile, setProfile] = useState<ProfileData | null>(null);

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
                router.replace("/login?next=/profile");
                return;
            }
            setEmail(user.email ?? "");

            const { data, error: err } = await supabase
                .from("partners")
                .select("prenom, nom, whatsapp, momo_phone, promo_code")
                .eq("auth_user_id", user.id)
                .maybeSingle();
            if (err) throw err;
            if (!data) {
                router.replace("/complete");
                return;
            }
            setProfile(data as ProfileData);
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
                <p className="text-red-400 text-sm">{error}</p>
            </main>
        );
    }
    if (!profile) return null;

    const fullName =
        `${profile.prenom ?? ""} ${profile.nom ?? ""}`.trim() || "—";

    return (
        <main className="min-h-screen px-4 sm:px-6 py-8 max-w-2xl mx-auto">
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-white">Mon profil</h1>
                <p className="text-sm text-gray-400 mt-1">
                    Vos informations personnelles enregistrées sur Stay229.
                </p>
            </header>

            {/* Carte identité */}
            <section className="rounded-2xl border border-brand-cyan/30 bg-brand-badge/40 p-5 mb-4">
                <p className="text-xs uppercase tracking-widest text-gray-400">
                    Identité
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-white mt-2">
                    {fullName}
                </p>
                <p className="text-sm text-brand-cyanLight mt-1 break-all">
                    {email}
                </p>
            </section>

            {/* Détails */}
            <section className="rounded-2xl border border-gray-800 bg-brand-badge/30 p-5 mb-4 space-y-4">
                <InfoRow label="Prénom" value={profile.prenom} />
                <InfoRow label="Nom" value={profile.nom} />
                <InfoRow label="Adresse email" value={email} />
            </section>

            {/* Coordonnées de paiement */}
            <section className="rounded-2xl border border-gray-800 bg-brand-badge/30 p-5 mb-4 space-y-4">
                <p className="text-xs uppercase tracking-widest text-gray-400">
                    Coordonnées
                </p>
                <InfoRow label="Numéro WhatsApp" value={profile.whatsapp} />
                <InfoRow
                    label="Numéro Mobile Money (paiements)"
                    value={profile.momo_phone}
                />
                <InfoRow
                    label="Code promo principal"
                    value={profile.promo_code}
                    mono
                />
            </section>

            <p className="text-xs text-gray-500 leading-relaxed mt-4">
                Pour modifier l'une de ces informations, écrivez à{" "}
                <a
                    href="mailto:supportstay229@gmail.com"
                    className="text-brand-cyan hover:underline"
                >
                    supportstay229@gmail.com
                </a>
                .
            </p>

            <footer className="mt-10 text-center">
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

function InfoRow({
    label,
    value,
    mono,
}: {
    label: string;
    value: string | null;
    mono?: boolean;
}) {
    return (
        <div>
            <p className="text-xs uppercase tracking-wider text-gray-400">
                {label}
            </p>
            <p
                className={`text-base text-white mt-1 break-all ${
                    mono ? "font-mono tracking-wider" : ""
                }`}
            >
                {value && value.trim() !== "" ? value : "—"}
            </p>
        </div>
    );
}
