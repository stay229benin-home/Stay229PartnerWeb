"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseClient, generatePromoCode } from "@/lib/supabase";

/**
 * Page "Compléter mon profil partenaire".
 *
 * Cas d'usage : un utilisateur Stay229 (voyageur ou fournisseur) veut devenir
 * partenaire SANS recréer un compte. Il s'est connecté via /login avec ses
 * identifiants Stay229 existants, mais sa ligne `partners` n'existe pas
 * encore.
 *
 * Cette page :
 *   1. Vérifie qu'il y a bien une session active (sinon redirige vers /login).
 *   2. Vérifie que l'utilisateur n'a PAS déjà une ligne `partners` (sinon
 *      redirige vers /dashboard pour éviter les doublons).
 *   3. Affiche un formulaire allégé (pas d'email/mdp) avec juste les infos
 *      personnelles + numéros WhatsApp et MoMo.
 *   4. À la soumission : INSERT via l'Edge Function `create-partner` (qui
 *      utilise la service_role key pour bypass RLS).
 */
export default function CompleteProfilePage() {
    const router = useRouter();
    const [bootLoading, setBootLoading] = useState(true);
    const [authUserId, setAuthUserId] = useState<string | null>(null);
    const [email, setEmail] = useState<string>("");
    const [form, setForm] = useState({
        prenom: "",
        nom: "",
        birthdate: "",
        whatsapp: "",
        momo: "",
        sameAsWhatsapp: false,
    });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        void boot();
    }, []);

    async function boot() {
        try {
            const supabase = createSupabaseClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace("/login?next=/complete");
                return;
            }
            // Si le user a déjà une ligne `partners` → direct dashboard.
            const { data: existing } = await supabase
                .from("partners")
                .select("id")
                .eq("auth_user_id", user.id)
                .maybeSingle();
            if (existing) {
                router.replace("/dashboard");
                return;
            }
            setAuthUserId(user.id);
            setEmail(user.email ?? "");
        } finally {
            setBootLoading(false);
        }
    }

    function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
        setForm((f) => ({ ...f, [k]: v }));
        setError(null);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!authUserId) {
            setError("Session perdue. Reconnectez-vous.");
            return;
        }
        if (form.prenom.trim() === "" || form.nom.trim() === "") {
            setError("Prénom et nom requis.");
            return;
        }
        if (form.whatsapp.trim() === "") {
            setError("Numéro WhatsApp requis.");
            return;
        }
        const momoNumber = form.sameAsWhatsapp ? form.whatsapp : form.momo;
        if (momoNumber.trim() === "") {
            setError("Numéro Mobile Money requis (ou cochez « même que WhatsApp »).");
            return;
        }

        setLoading(true);
        try {
            let lastErr = "";
            for (let attempt = 0; attempt < 5; attempt++) {
                const promo = generatePromoCode();
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-partner`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
                        },
                        body: JSON.stringify({
                            auth_user_id: authUserId,
                            prenom: form.prenom.trim(),
                            nom: form.nom.trim(),
                            birthdate: form.birthdate || null,
                            whatsapp: form.whatsapp.trim(),
                            momo_phone: momoNumber.trim(),
                            promo_code: promo,
                        }),
                    },
                );
                const json = await res.json();
                if (res.ok) {
                    router.push("/dashboard");
                    return;
                }
                lastErr = (json.error as string) ?? "Erreur inconnue.";
                if (!/promo_code|unique/i.test(lastErr)) break;
            }
            throw new Error(lastErr || "Création du profil partenaire impossible.");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur inconnue.");
        } finally {
            setLoading(false);
        }
    }

    if (bootLoading) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <p className="text-gray-400">Chargement…</p>
            </main>
        );
    }

    return (
        <main className="min-h-screen flex items-center justify-center px-6 py-12">
            <div className="max-w-md w-full space-y-6">
                <h1 className="text-3xl font-black italic brand-gradient text-center">
                    STAY229
                </h1>
                <p className="text-center text-gray-400 text-sm">
                    Compléter votre profil partenaire
                </p>

                <div className="rounded-lg border border-brand-cyan/30 bg-brand-cyan/5 px-3 py-2 text-xs text-gray-300 leading-relaxed">
                    Vous êtes connecté en tant que <strong className="text-brand-cyanLight">{email}</strong>. Remplissez ci-dessous vos infos pour activer votre rôle partenaire. Votre compte voyageur/fournisseur reste intact.
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <Field
                        label="Prénom"
                        value={form.prenom}
                        onChange={(v) => update("prenom", v)}
                        required
                    />
                    <Field
                        label="Nom"
                        value={form.nom}
                        onChange={(v) => update("nom", v)}
                        required
                    />
                    <Field
                        label="Date de naissance"
                        value={form.birthdate}
                        onChange={(v) => update("birthdate", v)}
                        type="date"
                    />
                    <Field
                        label="Numéro WhatsApp"
                        value={form.whatsapp}
                        onChange={(v) => update("whatsapp", v)}
                        type="tel"
                        placeholder="+229 90 12 34 56"
                        required
                    />

                    <label className="flex items-center gap-2 text-sm text-gray-300 select-none">
                        <input
                            type="checkbox"
                            checked={form.sameAsWhatsapp}
                            onChange={(e) =>
                                update("sameAsWhatsapp", e.target.checked)
                            }
                            className="rounded border-gray-700"
                        />
                        Mon numéro MoMo est le même que WhatsApp
                    </label>

                    {!form.sameAsWhatsapp && (
                        <Field
                            label="Numéro Mobile Money (pour vos paiements)"
                            value={form.momo}
                            onChange={(v) => update("momo", v)}
                            type="tel"
                            placeholder="+229 …"
                            required
                        />
                    )}

                    {error && (
                        <p className="text-sm text-red-400">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-xl bg-brand-cyan text-black font-semibold py-3 hover:opacity-90 disabled:opacity-50 transition mt-3"
                    >
                        {loading ? "Activation…" : "Activer mon profil partenaire"}
                    </button>
                </form>

                <div className="text-center text-sm text-gray-400">
                    <Link href="/" className="text-gray-500 hover:text-gray-300">
                        ← Retour
                    </Link>
                </div>
            </div>
        </main>
    );
}

function Field({
    label,
    value,
    onChange,
    type = "text",
    placeholder,
    required,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    placeholder?: string;
    required?: boolean;
}) {
    return (
        <div>
            <label className="block text-sm text-gray-300 mb-1">{label}</label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                required={required}
                className="w-full rounded-lg bg-brand-badge border border-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
            />
        </div>
    );
}
