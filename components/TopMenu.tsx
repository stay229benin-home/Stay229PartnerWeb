"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";

/**
 * Barre de navigation supérieure pour les pages connectées.
 *
 * Affiche les 4 entrées demandées (Dashboard / Codes promo / Règles /
 * Contact) + un bouton de déconnexion. Devient un menu hamburger en
 * dessous de `sm`.
 *
 * Le composant s'auto-cache si l'utilisateur n'est pas authentifié, ce
 * qui permet de l'inclure inconditionnellement dans `layout.tsx`. La
 * landing page (`/`), `/login` et `/signup` ne montrent donc PAS le menu.
 */

type NavItem = {
    href: string;
    label: string;
    external?: boolean;
};

const NAV_ITEMS: readonly NavItem[] = [
    { href: "/dashboard", label: "Tableau de bord" },
    { href: "/promo-codes", label: "Codes promo" },
    { href: "/rules", label: "Règles du programme" },
    {
        href: "mailto:supportstay229@gmail.com",
        label: "Nous contacter",
        external: true,
    },
];

export default function TopMenu() {
    const pathname = usePathname() ?? "";
    const router = useRouter();
    const [authed, setAuthed] = useState<boolean | null>(null);
    const [open, setOpen] = useState(false);

    // Routes publiques où on cache le menu, même si l'utilisateur est
    // techniquement connecté (UX plus propre sur la landing).
    const publicRoutes = ["/", "/login", "/signup"];
    const isPublic = publicRoutes.includes(pathname);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const supabase = createSupabaseClient();
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                if (!cancelled) setAuthed(!!user);
            } catch {
                if (!cancelled) setAuthed(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [pathname]);

    async function signOut() {
        const supabase = createSupabaseClient();
        await supabase.auth.signOut();
        setOpen(false);
        router.replace("/");
    }

    if (isPublic) return null;
    if (authed !== true) return null;

    return (
        <nav className="sticky top-0 z-30 bg-[#060B14]/90 backdrop-blur border-b border-gray-800">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
                <Link
                    href="/dashboard"
                    className="text-xl font-black italic brand-gradient tracking-tight"
                >
                    STAY229
                </Link>

                {/* Liens desktop */}
                <div className="hidden md:flex items-center gap-2">
                    {NAV_ITEMS.map((item) => {
                        const active =
                            !item.external && pathname.startsWith(item.href);
                        const cls = active
                            ? "px-3 py-1.5 rounded-lg text-sm font-semibold text-brand-cyanLight bg-brand-cyan/10"
                            : "px-3 py-1.5 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5";
                        return item.external ? (
                            <a key={item.href} href={item.href} className={cls}>
                                {item.label}
                            </a>
                        ) : (
                            <Link key={item.href} href={item.href} className={cls}>
                                {item.label}
                            </Link>
                        );
                    })}
                    <button
                        onClick={signOut}
                        className="ml-2 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                        Se déconnecter
                    </button>
                </div>

                {/* Bouton burger mobile */}
                <button
                    onClick={() => setOpen((v) => !v)}
                    aria-label="Ouvrir le menu"
                    className="md:hidden p-2 rounded-lg text-gray-300 hover:bg-white/5"
                >
                    <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                    >
                        {open ? (
                            <>
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </>
                        ) : (
                            <>
                                <line x1="3" y1="6" x2="21" y2="6" />
                                <line x1="3" y1="12" x2="21" y2="12" />
                                <line x1="3" y1="18" x2="21" y2="18" />
                            </>
                        )}
                    </svg>
                </button>
            </div>

            {/* Panneau mobile déroulant */}
            {open && (
                <div className="md:hidden border-t border-gray-800 px-4 py-3 space-y-1 bg-[#060B14]">
                    {NAV_ITEMS.map((item) => {
                        const active =
                            !item.external && pathname.startsWith(item.href);
                        const cls = active
                            ? "block px-3 py-2 rounded-lg text-sm font-semibold text-brand-cyanLight bg-brand-cyan/10"
                            : "block px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/5";
                        return item.external ? (
                            <a
                                key={item.href}
                                href={item.href}
                                onClick={() => setOpen(false)}
                                className={cls}
                            >
                                {item.label}
                            </a>
                        ) : (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setOpen(false)}
                                className={cls}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                    <button
                        onClick={signOut}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                        Se déconnecter
                    </button>
                </div>
            )}
        </nav>
    );
}
