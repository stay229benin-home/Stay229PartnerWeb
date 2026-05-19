"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Client Supabase pour le navigateur. Persiste la session dans les cookies
 * via @supabase/ssr → la session survit au rafraîchissement de page et au
 * redémarrage du navigateur.
 *
 * Les deux variables d'environnement NEXT_PUBLIC_* sont publiques par
 * conception (la sécurité réelle vient des RLS configurées dans la
 * migration 0014). Configurer dans `.env.local` (cf. `.env.local.example`).
 */
export function createSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
        throw new Error(
            "Variables d'environnement Supabase manquantes — copie `.env.local.example` en `.env.local` et remplis NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY.",
        );
    }
    return createBrowserClient(url, anonKey);
}

/**
 * Alphabet utilisé pour les codes promo : 32 caractères alphanumériques
 * majuscules, sans confusions visuelles (0/O, 1/I/L). Aligné avec la
 * contrainte CHECK de la migration 0014 (`^[A-Z0-9]+$`).
 */
const PROMO_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * Génère un code promo aléatoire 8 caractères alphanumériques majuscules,
 * sans caractères ambigus (0/O, 1/I, etc.). 32^8 ≈ 10^12 combinaisons → quasi
 * zéro collision avant des dizaines de milliers de partenaires. En cas de
 * collision la contrainte UNIQUE fait remonter une erreur côté Supabase et
 * le client peut retenter.
 */
export function generatePromoCode(): string {
    let out = "";
    for (let i = 0; i < 8; i++) {
        out += PROMO_ALPHABET[Math.floor(Math.random() * PROMO_ALPHABET.length)];
    }
    return out;
}

/**
 * Normalise un code saisi par l'utilisateur : majuscule + sans espaces. Ne
 * fait PAS de validation — pour ça appeler `isValidCustomPromoCode`.
 */
export function normalizePromoCode(input: string): string {
    return input.trim().toUpperCase();
}

/**
 * Valide un code promo personnalisé (saisi par le partenaire) :
 *  - 5 à 15 caractères,
 *  - alphabet [A-Z0-9] uniquement,
 *  - n'utilise pas les caractères ambigus 0/O, 1/I, L (pour rester
 *    cohérent avec les codes auto-générés et éviter les fautes de frappe
 *    des filleuls).
 */
export function isValidCustomPromoCode(code: string): boolean {
    if (code.length < 5 || code.length > 15) return false;
    if (!/^[A-Z0-9]+$/.test(code)) return false;
    if (/[01OIL]/.test(code)) return false;
    return true;
}

/**
 * Plateformes proposées dans le formulaire "nouveau code". Liste libre :
 * le champ DB reste un text, l'utilisateur peut aussi tout taper à la main.
 */
export const PROMO_PLATFORMS = [
    "Instagram",
    "TikTok",
    "Facebook",
    "WhatsApp",
    "YouTube",
    "Snapchat",
    "Twitter / X",
    "LinkedIn",
    "Bouche à oreille",
    "Autre",
] as const;

export type PromoPlatform = (typeof PROMO_PLATFORMS)[number];

/**
 * Type de ligne lu depuis la table partner_promo_codes (migration 0017).
 */
export type PartnerPromoCode = {
    id: string;
    partner_id: string;
    code: string;
    platform: string | null;
    profile_url: string | null;
    label: string | null;
    is_active: boolean;
    created_at: string;
};
