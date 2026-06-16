"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";
import TurnstileWidget from "@/components/TurnstileWidget";

/**
 * Étape 1 du reset de mot de passe.
 * L'utilisateur saisit son email → Supabase envoie un OTP à 6 chiffres via Resend.
 * On redirige ensuite vers /reset-password?email=... pour la vérification.
 */
export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sent, setSent] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const supabase = createSupabaseClient();
            const { error: err } = await supabase.auth.signInWithOtp({
                email: email.trim(),
                options: {
                    shouldCreateUser: false,
                    captchaToken: captchaToken ?? undefined,
                },
            });

            if (err) {
                // Supabase renvoie toujours "success" pour éviter l'énumération —
                // une erreur ici indique un vrai problème (ex. captcha invalide).
                setError(err.message || "Impossible d'envoyer le code. Réessayez.");
                setLoading(false);
                return;
            }

            // Succès : on affiche un message et on redirige après 2 s
            setSent(true);
            setTimeout(() => {
                router.push(`/reset-password?email=${encodeURIComponent(email.trim())}`);
            }, 2000);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur inconnue.");
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center px-6 py-12">
            <div className="max-w-sm w-full space-y-6">
                <h1 className="text-3xl font-black italic brand-gradient text-center">
                    STAY229
                </h1>
                <p className="text-center text-gray-400 text-sm">
                    Mot de passe oublié
                </p>

                {sent ? (
                    <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-4 text-sm text-green-300 text-center space-y-1">
                        <p className="font-semibold">Code envoyé !</p>
                        <p>Vérifiez votre boîte mail. Redirection en cours…</p>
                    </div>
                ) : (
                    <>
                        <p className="text-sm text-gray-400 text-center">
                            Entrez votre adresse email. Nous vous enverrons un code à 6 chiffres pour réinitialiser votre mot de passe.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-300 mb-1">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                    placeholder="votre@email.com"
                                    className="w-full rounded-lg bg-brand-badge border border-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                                />
                            </div>

                            {error && (
                                <p className="text-sm text-red-400">{error}</p>
                            )}

                            <TurnstileWidget onVerify={(token) => setCaptchaToken(token)} />

                            <button
                                type="submit"
                                disabled={loading || !captchaToken}
                                className="w-full rounded-xl bg-brand-cyan text-black font-semibold py-3 hover:opacity-90 disabled:opacity-50 transition"
                            >
                                {loading ? "Envoi en cours…" : "Envoyer le code"}
                            </button>
                        </form>
                    </>
                )}

                <div className="text-center text-sm text-gray-400 space-y-2">
                    <p>
                        <Link href="/login" className="text-brand-cyan hover:underline">
                            ← Retour à la connexion
                        </Link>
                    </p>
                </div>
            </div>
        </main>
    );
}
