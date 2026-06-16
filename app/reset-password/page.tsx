"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase";

/**
 * Étape 2 du reset de mot de passe.
 * L'utilisateur saisit le code OTP reçu par email + son nouveau mot de passe.
 * Après vérification : verifyOtp() → updateUser() → redirect /dashboard.
 */
function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get("email") ?? "";

    const [otp, setOtp] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (otp.trim().length !== 6) {
            setError("Le code doit contenir exactement 6 chiffres.");
            return;
        }
        if (password.length < 8) {
            setError("Le mot de passe doit faire au moins 8 caractères.");
            return;
        }
        if (password !== confirm) {
            setError("Les mots de passe ne correspondent pas.");
            return;
        }

        setLoading(true);
        try {
            const supabase = createSupabaseClient();

            // 1. Vérifier l'OTP → crée une session
            const { error: verifyErr } = await supabase.auth.verifyOtp({
                email,
                token: otp.trim(),
                type: "email",
            });
            if (verifyErr) {
                setError(
                    verifyErr.message === "Token has expired or is invalid"
                        ? "Code invalide ou expiré. Recommencez depuis « Mot de passe oublié »."
                        : verifyErr.message || "Code invalide.",
                );
                setLoading(false);
                return;
            }

            // 2. Mettre à jour le mot de passe (session active grâce au verifyOtp)
            const { error: updateErr } = await supabase.auth.updateUser({
                password,
            });
            if (updateErr) {
                setError(updateErr.message || "Impossible de mettre à jour le mot de passe.");
                setLoading(false);
                return;
            }

            // 3. L'utilisateur est connecté → dashboard
            router.push("/dashboard");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Erreur inconnue.");
            setLoading(false);
        }
    }

    if (!email) {
        return (
            <div className="text-center space-y-4">
                <p className="text-gray-400 text-sm">
                    Lien invalide. Veuillez recommencer depuis la page de récupération.
                </p>
                <Link href="/forgot-password" className="text-brand-cyan hover:underline text-sm">
                    ← Mot de passe oublié
                </Link>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm text-gray-300 mb-1">
                    Code reçu par email
                </label>
                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    required
                    placeholder="123456"
                    autoComplete="one-time-code"
                    className="w-full rounded-lg bg-brand-badge border border-gray-700 px-3 py-2 text-white text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                />
            </div>

            <div>
                <label className="block text-sm text-gray-300 mb-1">
                    Nouveau mot de passe
                </label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full rounded-lg bg-brand-badge border border-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                />
                <p className="text-xs text-gray-500 mt-1">Au moins 8 caractères.</p>
            </div>

            <div>
                <label className="block text-sm text-gray-300 mb-1">
                    Confirmer le mot de passe
                </label>
                <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="w-full rounded-lg bg-brand-badge border border-gray-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                />
            </div>

            {error && (
                <p className="text-sm text-red-400">{error}</p>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-brand-cyan text-black font-semibold py-3 hover:opacity-90 disabled:opacity-50 transition"
            >
                {loading ? "Validation…" : "Valider et me connecter"}
            </button>

            <p className="text-center text-xs text-gray-500">
                Code non reçu ?{" "}
                <Link href="/forgot-password" className="text-brand-cyan hover:underline">
                    Renvoyer
                </Link>
            </p>
        </form>
    );
}

export default function ResetPasswordPage() {
    const searchParams_dummy = null; // évite un import inutilisé
    void searchParams_dummy;

    return (
        <main className="min-h-screen flex items-center justify-center px-6 py-12">
            <div className="max-w-sm w-full space-y-6">
                <h1 className="text-3xl font-black italic brand-gradient text-center">
                    STAY229
                </h1>
                <p className="text-center text-gray-400 text-sm">
                    Réinitialisation du mot de passe
                </p>

                <Suspense fallback={<p className="text-center text-gray-500 text-sm">Chargement…</p>}>
                    <ResetPasswordForm />
                </Suspense>

                <div className="text-center">
                    <Link href="/login" className="text-gray-500 hover:text-gray-300 text-sm">
                        ← Retour à la connexion
                    </Link>
                </div>
            </div>
        </main>
    );
}
