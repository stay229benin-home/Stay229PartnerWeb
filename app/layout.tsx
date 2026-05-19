import type { Metadata } from "next";
import "./globals.css";
import TopMenu from "@/components/TopMenu";

export const metadata: Metadata = {
    title: "Stay229 — Espace partenaires",
    description:
        "Suivi des affiliations et commissions Stay229 pour les partenaires.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="fr">
            <body className="min-h-screen">
                {/* TopMenu se cache tout seul sur /, /login et /signup */}
                <TopMenu />
                {children}
            </body>
        </html>
    );
}
