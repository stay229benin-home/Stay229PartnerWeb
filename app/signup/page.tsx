"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseClient, generatePromoCode } from "@/lib/supabase";
import TurnstileWidget from "@/components/TurnstileWidget";

export default function SignupPage() {
    const router = useRouter();
    const [form, setForm] = useState({
        email: "",
        password: "",
        prenom: "",
        nom: "",
        birthdate: "",
        whatsapp: "",
        momo: "",
        sameAsWhatsapp: false,
    });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);

    function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
        setForm((f) => ({ ...f, [key]: value }));
        setError(null);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (form.password.length < 8) {
            setError("Le mot de passe doit faire au moins 8 caractères.");
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
            const supabase = createSupabaseClient();

            // 1. Création compte auth
            const { data: signUp, error: signErr } = await supabase.auth.signUp({
                email: form.email.trim(),
                password: form.password,
                options: { captchaToken: captchaToken ?? undefined },
            });
            if (signErr) throw new Error(signErr.message);

            // Anti-énumération Supabase : si l'email est DÉJÀ inscrit OU
            // que « Confirm email » est ON, signUp retourne un user
            // factice SANS session. On tente une connexion immédiate
            // pour distinguer les cas et obtenir une vraie session.
            if (!signUp.session) {
                const { data: signIn, error: signInErr } =
                    await supabase.auth.signInWithPassword({
                        email: form.email.trim(),
                        password: form.password,
                    });

                if (signInErr || !signIn.session) {
                    const m = signInErr?.message ?? "";
                    if (/email.*not.*confirmed|confirm/i.test(m)) {
                        throw new Error(
                            "La confirmation par email est activée côté Supabase. Désactivez « Confirm email » dans Supabase Dashboard → Authentication → Providers → Email, puis réessayez. (Voir MANUEL_DEPLOIEMENT.html.)",
                        );
                    }
                    if (/invalid.*credentials|invalid.*login/i.test(m)) {
                        throw new Error(
                            "Cet email est déjà utilisé sur Stay229. Pour ajouter le rôle partenaire à votre compte, retapez le MÊME mot de passe que celui que vous utilisez sur l'app voyageur ou fournisseur. Mot de passe oublié ? Allez sur « Se connecter ».",
                        );
                    }
                    throw new Error(
                        m || "Impossible d'établir une session après l'inscription.",
                    );
                }
            }

            // À ce stade on a forcément une session. On récupère le vrai
            // userId via getUser() (plus fiable que signUp.user.id en
            // cas d'anti-énumération).
            const { data: userData, error: userErr } = await supabase.auth.getUser();
            if (userErr || !userData.user) {
                throw new Error(
                    "Session créée mais utilisateur introuvable. Réessayez.",
                );
            }
            const authUserId = userData.user.id;

            // Si le user a déjà une ligne partners → direct dashboard.
            const { data: existing } = await supabase
                .from("partners")
                .select("id")
                .eq("auth_user_id", authUserId)
                .maybeSingle();
            if (existing) {
                router.push("/dashboard");
                return;
            }

            // 2. INSERT via Edge Function (bypass RLS avec service_role)
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
                    }
                );

                const json = await res.json();

                if (res.ok) {
                    router.push("/dashboard");
                    return;
                }

                lastErr = (json.error as string) ?? "Erreur inconnue.";
                if (!/promo_code|unique/i.test(lastErr)) break;
            }
            if (lastErr && /foreign key|partners_auth_user_id_fkey/i.test(lastErr)) {
                throw new Error(
                    "Erreur d'inscription : le compte n'est pas reconnu côté Supabase. Vérifiez (1) que « Confirm email » est désactivé dans Supabase → Authentication → Providers → Email, et (2) qu'aucune doublure de cet email n'existe dans Authentication → Users.",
                );
            }
            throw new Error(lastErr || "Création du profil partenaire impossible.");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur inconnue.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center px-6 py-12">
            <div className="max-w-md w-full space-y-6">
                <h1 className="text-3xl font-black italic brand-gradient text-center">
                    STAY229
                </h1>
                <p className="text-center text-gray-400 text-sm">
                    Devenir partenaire
                </p>

                <div className="rounded-lg border border-brand-cyan/30 bg-brand-cyan/5 px-3 py-2 text-xs text-gray-300 leading-relaxed">
                    <strong className="text-brand-cyanLight">Vous avez déjà un compte Stay229 ?</strong>{" "}
                    Utilisez le <strong>même email</strong> et le <strong>même mot de passe</strong> que sur l'app voyageur ou l'app fournisseur — vos données existantes sont conservées et le rôle partenaire sera ajouté à votre compte.
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

                    <div className="pt-2 border-t border-gray-800 mt-2" />

                    <Field
                        label="Email"
                        value={form.email}
                        onChange={(v) => update("email", v)}
                        type="email"
                        required
                    />
                    <Field
                        label="Mot de passe"
                        value={form.password}
                        onChange={(v) => update("password", v)}
                        type="password"
                        required
                        helper="Au moins 8 caractères."
                    />

                    {error && (
                        <p className="text-sm text-red-400">{error}</p>
                    )}

                    <TurnstileWidget onVerify={(token) => setCaptchaToken(token)} />

                    <button
                        type="submit"
                        disabled={loading || !captchaToken}
                        className="w-full rounded-xl bg-brand-cyan text-black font-semibold py-3 hover:opacity-90 disabled:opacity-50 transition mt-3"
                    >
                        {loading ? "Création du compte…" : "Créer mon compte partenaire"}
                    </button>
                </form>

                <div className="text-center text-sm text-gray-400 space-y-2">
                    <p>
                        Déjà partenaire ?{" "}
                        <Link href="/login" className="text-brand-cyan hover:underline">
                            Se connecter
                        </Link>
                    </p>
                    <p>
                        <Link href="/" className="text-gray-500 hover:text-gray-300">
                            ← Retour
                        </Link>
                    </p>
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
    helper,
    required,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    placeholder?: string;
    helper?: string;
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
            {helper && <p className="text-xs text-gray-500 mt-1">{helper}</p>}
        </div>
    );
}
