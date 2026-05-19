import Link from "next/link";

/**
 * Page règles complètes du programme d'affiliation. Rendue server-side
 * (statique) puisqu'aucune donnée du partenaire n'est affichée ici.
 *
 * Le texte est volontairement direct : on explique chaque chiffre, on
 * donne des exemples chiffrés, et on rappelle les conditions de retrait.
 * Aucune phrase n'est là pour faire du remplissage marketing.
 */
export default function RulesPage() {
    return (
        <main className="min-h-screen px-4 sm:px-6 py-8 max-w-3xl mx-auto text-gray-200">
            <header className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                    Règles du programme d'affiliation
                </h1>
                <p className="text-sm text-gray-400 mt-2">
                    Mise à jour : 19 mai 2026. Ces règles annulent et
                    remplacent toute version antérieure.
                </p>
            </header>

            <Section title="1. Comment gagner une commission">
                <p>
                    Vous êtes partenaire Stay229 dès que votre compte est
                    activé. À l'inscription, on vous attribue un code promo
                    unique. Vous pouvez aussi créer d'autres codes
                    personnalisés depuis la page Codes promo.
                </p>
                <p>
                    Pour qu'un client devienne votre filleul, il doit saisir
                    un de vos codes au moment de son inscription sur l'app
                    Stay229. Vous touchez ensuite une commission sur chacune
                    de ses réservations d'appartement confirmées (court
                    séjour), tant que vous êtes dans la fenêtre de paiement
                    de votre niveau.
                </p>
                <p>
                    Les visites de logements longue durée (frais forfaitaires
                    de 2 000 F CFA) ne génèrent pas de commission.
                </p>
            </Section>

            <Section title="2. Calcul de la commission">
                <p>
                    La commission de base, c'est{" "}
                    <span className="text-brand-cyanLight font-semibold">
                        3 % du montant de la réservation
                    </span>
                    , plafonnée à{" "}
                    <span className="text-brand-cyanLight font-semibold">
                        700 F CFA
                    </span>
                    .
                </p>
                <p>
                    Tant que 3 % de la réservation est inférieur à 700 F,
                    votre commission est égale à 3 % du montant. Dès que
                    3 % du montant dépasserait 700 F, votre commission est
                    plafonnée à 700 F.
                </p>
                <div className="rounded-xl border border-gray-800 bg-brand-badge/40 p-4 text-sm space-y-1">
                    <p>
                        Résa à <span className="font-mono">10 000 F</span> →
                        commission ={" "}
                        <span className="font-mono text-brand-cyanLight">
                            300 F
                        </span>
                    </p>
                    <p>
                        Résa à <span className="font-mono">15 000 F</span> →
                        commission ={" "}
                        <span className="font-mono text-brand-cyanLight">
                            450 F
                        </span>
                    </p>
                    <p>
                        Résa à <span className="font-mono">23 000 F</span> →
                        commission ={" "}
                        <span className="font-mono text-brand-cyanLight">
                            690 F
                        </span>
                    </p>
                    <p>
                        Résa à <span className="font-mono">25 000 F</span> →
                        commission ={" "}
                        <span className="font-mono text-brand-cyanLight">
                            700 F
                        </span>{" "}
                        (plafond)
                    </p>
                    <p>
                        Résa à <span className="font-mono">100 000 F</span> →
                        commission ={" "}
                        <span className="font-mono text-brand-cyanLight">
                            700 F
                        </span>{" "}
                        (plafond)
                    </p>
                </div>
                <p className="text-xs text-gray-400">
                    À titre indicatif, ces 700 F représentent environ 30 % de
                    la marge que Stay229 fait sur une réservation. Aux
                    niveaux supérieurs (4 et Gold), le taux et le plafond
                    sont relevés (voir section 3).
                </p>
            </Section>

            <Section title="3. Les 5 niveaux du programme">
                <p>
                    Votre niveau est déterminé par le nombre de{" "}
                    <span className="font-semibold">filleuls actifs</span>,
                    c'est-à-dire ceux qui ont fait au moins une réservation
                    d'appartement confirmée. Un filleul qui s'inscrit mais ne
                    réserve jamais ne fait pas monter votre niveau.
                </p>

                <div className="overflow-x-auto rounded-xl border border-gray-800">
                    <table className="w-full text-sm">
                        <thead className="bg-brand-badge/40 text-gray-400">
                            <tr>
                                <th className="text-left px-3 py-2">Niveau</th>
                                <th className="text-left px-3 py-2">
                                    Filleuls actifs
                                </th>
                                <th className="text-right px-3 py-2">Taux</th>
                                <th className="text-right px-3 py-2">
                                    Plafond
                                </th>
                                <th className="text-right px-3 py-2">Durée</th>
                            </tr>
                        </thead>
                        <tbody>
                            <Row n="1" range="1 à 5" rate="3 %" cap="700 F" duration="4 mois" />
                            <Row n="2" range="6 à 14" rate="3 %" cap="700 F" duration="6 mois" />
                            <Row n="3" range="15 à 29" rate="3 %" cap="700 F" duration="9 mois" />
                            <Row n="4" range="30 à 49" rate="3,5 %" cap="850 F" duration="12 mois" />
                            <Row n="Gold" range="50 et +" rate="4 %" cap="1 000 F" duration="à vie" gold />
                        </tbody>
                    </table>
                </div>

                <p>
                    Le décompte de la durée commence à la première
                    réservation confirmée parmi vos filleuls. Le niveau est
                    recalculé à chaque nouvelle activité, donc dès que vous
                    franchissez un palier, la durée s'allonge et le taux
                    s'ajuste pour les commissions à venir.
                </p>
                <p>
                    Exemple : vous êtes niveau 1 (4 mois). Au mois 3, vous
                    passez à 8 filleuls actifs (niveau 2). Votre fenêtre
                    passe alors à 6 mois au total depuis votre première résa
                    — vous gagnez donc 3 mois supplémentaires de paiement.
                </p>
                <p>
                    Une fois Gold (50 filleuls actifs), vous restez payé à
                    4 % / 1 000 F pour toutes les futures réservations de vos
                    filleuls, sans limite de durée.
                </p>
            </Section>

            <Section title="4. Conditions de retrait">
                <ul className="space-y-2 list-disc list-inside marker:text-brand-cyanLight">
                    <li>
                        Avoir au moins{" "}
                        <span className="font-semibold">3 filleuls</span>{" "}
                        inscrits avec votre code.
                    </li>
                    <li>
                        Avoir cumulé au moins{" "}
                        <span className="font-semibold">2 500 F CFA</span> de
                        commission.
                    </li>
                    <li>
                        Les paiements sont effectués manuellement chaque{" "}
                        <span className="font-semibold">vendredi</span> et
                        chaque <span className="font-semibold">samedi</span>,
                        sur le numéro Mobile Money renseigné dans votre
                        profil.
                    </li>
                </ul>
                <p className="text-xs text-gray-400 mt-2">
                    Tant que ces conditions ne sont pas réunies, les
                    commissions restent affichées dans votre tableau de bord
                    et continuent de s'accumuler.
                </p>
            </Section>

            <Section title="5. Réduction pour les filleuls">
                <p>
                    Chaque filleul lié à votre code bénéficie de{" "}
                    <span className="text-brand-cyanLight font-semibold">
                        10 % de réduction
                    </span>{" "}
                    sur sa première réservation d'appartement. Cette
                    réduction est appliquée automatiquement au moment du
                    paiement dans l'app Stay229. Elle ne s'applique pas aux
                    visites longue durée.
                </p>
            </Section>

            <Section title="6. Suspension, fraude et modifications">
                <p>
                    Stay229 se réserve le droit de suspendre un compte
                    partenaire en cas de fraude, de partage de codes via des
                    canaux non autorisés (faux comptes, achat de trafic
                    artificiel, etc.) ou de tout comportement portant
                    préjudice à la marque ou à ses utilisateurs.
                </p>
                <p>
                    Stay229 peut faire évoluer les taux, plafonds ou durées
                    du programme. Les commissions déjà acquises ne sont
                    jamais réduites : un changement de règles ne s'applique
                    qu'aux résas postérieures à la mise à jour.
                </p>
            </Section>

            <Section title="7. Une question ?">
                <p>
                    Écrivez à{" "}
                    <a
                        href="mailto:supportstay229@gmail.com"
                        className="text-brand-cyan hover:underline"
                    >
                        supportstay229@gmail.com
                    </a>{" "}
                    — on revient vers vous dans les meilleurs délais.
                </p>
            </Section>

            <footer className="mt-10 pt-6 border-t border-gray-800 text-center">
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

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="mb-8 space-y-3">
            <h2 className="text-lg sm:text-xl font-semibold text-white">
                {title}
            </h2>
            <div className="space-y-3 leading-relaxed text-sm sm:text-base">
                {children}
            </div>
        </section>
    );
}

function Row({
    n,
    range,
    rate,
    cap,
    duration,
    gold,
}: {
    n: string;
    range: string;
    rate: string;
    cap: string;
    duration: string;
    gold?: boolean;
}) {
    return (
        <tr
            className={`border-t border-gray-800 ${gold ? "bg-yellow-500/5" : ""}`}
        >
            <td className="px-3 py-2 font-semibold text-white">
                {gold ? <span className="text-yellow-300">{n}</span> : n}
            </td>
            <td className="px-3 py-2 text-gray-300">{range}</td>
            <td className="px-3 py-2 text-right text-gray-300">{rate}</td>
            <td className="px-3 py-2 text-right text-gray-300">{cap}</td>
            <td className="px-3 py-2 text-right text-gray-300">{duration}</td>
        </tr>
    );
}
