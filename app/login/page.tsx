"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";
import TurnstileWidget from "@/components/TurnstileWidget";

/**
 * Page de connexion partenaire. Email + mot de passe via Supabase Auth
 * (le même backend que l'app Android voyageur).
 *
 * Après connexion → redirection vers /dashboard. Si le user n'a pas encore
 * de ligne `partners`, /dashboard détecte ça et redirige vers /complete.
 */
export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const supabase = createSupabaseClient();
            const { error: err } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
                options: { captchaToken: captchaToken ?? undefined },
            });
            if (err) {
                setError(err.message || "Connexion impossible.");
                setLoading(false);
                return;
            }
            router.push("/dashboard");
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
                    Connexion à l'espace partenaires
                </p>

                <div className="rounded-lg border border-brand-cyan/30 bg-brand-cyan/5 px-3 py-2 text-xs text-gray-300 leading-relaxed">
                    Vous avez déjà un compte sur l'app voyageur ou fournisseur ? Connectez-vous ici avec le <strong>même email et mot de passe</strong>. Si vous n'êtes pas encore partenaire, vous serez redirigé pour compléter votre profil.
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoComplete="email"
                            className="w-full rounded-lg bg-brand-badge border border-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-300 mb-1">Mot de passe</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
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
                        {loading ? "Connexion…" : "Se connecter"}
                    </button>
                </form>

                <div className="text-center text-sm text-gray-400 space-y-2">
                    <p>
                        <Link href="/forgot-password" className="text-brand-cyan hover:underline">
                            Mot de passe oublié ?
                        </Link>
                    </p>
                    <p>
                        Pas encore partenaire ?{" "}
                        <Link href="/signup" className="text-brand-cyan hover:underline">
                            Devenir partenaire
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
