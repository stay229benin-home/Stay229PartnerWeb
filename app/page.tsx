import Link from "next/link";

/**
 * Landing page de l'espace partenaires Stay229.
 *
 * Structure :
 *   1) En-tête de bienvenue.
 *   2) Explication pédagogique du programme (commission variable, plafonds,
 *      tableau des 5 niveaux, conditions de retrait).
 *   3) Section CTA en bas avec rappel des conditions du programme.
 *
 * Pas de session ici : c'est une page statique servie aux visiteurs anonymes.
 * La logique d'auth vit dans /login, /signup et /dashboard.
 */
export default function LandingPage() {
    return (
        <main className="min-h-screen">
            {/* En-tête */}
            <header className="px-6 pt-12 pb-6 max-w-2xl mx-auto text-center">
                <h1 className="text-4xl sm:text-5xl font-black italic brand-gradient tracking-tight">
                    STAY229
                </h1>
                <p className="mt-3 text-sm uppercase tracking-widest text-gray-400">
                    Espace partenaires
                </p>
            </header>

            {/* Section 1 — Bienvenue */}
            <section className="px-6 max-w-2xl mx-auto space-y-4 text-gray-200">
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                    Bienvenue chez Stay229
                </h2>
                <p className="leading-relaxed">
                    Content de vous voir ici. Le principe de notre programme
                    partenaires tient en une phrase : vous nous ramenez des
                    clients via votre code promo, et chaque fois que l'un
                    d'entre eux réserve un appartement, on vous reverse une
                    commission.
                </p>
                <p className="leading-relaxed">
                    De leur côté, vos filleuls économisent{" "}
                    <span className="text-brand-cyanLight font-semibold">
                        jusqu'à 10 %
                    </span>{" "}
                    sur leurs réservations grâce à du cashback crédité
                    automatiquement sur leur portefeuille Stay229. Ce solde
                    est ensuite utilisable comme réduction sur leurs futures
                    réservations. C'est ce qui les pousse à utiliser votre
                    code plutôt qu'à réserver à l'aveugle.
                </p>
            </section>

            {/* Section 2 — Calcul commission */}
            <section className="px-6 max-w-2xl mx-auto mt-10 space-y-4 text-gray-200">
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                    Comment on calcule votre commission
                </h2>
                <p className="leading-relaxed">
                    À chaque réservation d'appartement confirmée d'un de vos
                    filleuls, vous touchez{" "}
                    <span className="text-brand-cyanLight font-semibold">
                        3 % du montant de la réservation
                    </span>
                    , plafonné à{" "}
                    <span className="text-brand-cyanLight font-semibold">
                        700 F CFA
                    </span>
                    .
                </p>
                <div className="rounded-xl border border-gray-800 bg-brand-badge/40 p-4 space-y-2 text-sm">
                    <p>
                        Si votre filleul réserve à{" "}
                        <span className="font-mono">15 000 F</span>, vous
                        touchez{" "}
                        <span className="font-mono text-brand-cyanLight">
                            450 F
                        </span>{" "}
                        (3 % du total).
                    </p>
                    <p>
                        S'il réserve à <span className="font-mono">30 000 F</span>,
                        vous touchez{" "}
                        <span className="font-mono text-brand-cyanLight">
                            700 F
                        </span>{" "}
                        — le plafond est atteint, vous ne gagnez pas plus
                        au-delà.
                    </p>
                    <p className="text-xs text-gray-400 pt-1">
                        À titre indicatif, ces 700 F représentent environ 30 %
                        de la marge que Stay229 fait sur la réservation.
                    </p>
                </div>
            </section>

            {/* Section 3 — Niveaux */}
            <section className="px-6 max-w-2xl mx-auto mt-10 space-y-4 text-gray-200">
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                    Cinq niveaux, cinq paliers de récompense
                </h2>
                <p className="leading-relaxed">
                    Votre niveau dépend du nombre de filleuls qui ont fait au
                    moins une réservation confirmée. Plus vous en avez, plus on
                    vous garde longtemps dans le programme — et à partir du
                    niveau 4, on monte aussi votre taux et votre plafond.
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
                            <LevelRow
                                level="1"
                                range="1 à 5"
                                rate="3 %"
                                cap="700 F"
                                duration="4 mois"
                            />
                            <LevelRow
                                level="2"
                                range="6 à 14"
                                rate="3 %"
                                cap="700 F"
                                duration="6 mois"
                            />
                            <LevelRow
                                level="3"
                                range="15 à 29"
                                rate="3 %"
                                cap="700 F"
                                duration="9 mois"
                            />
                            <LevelRow
                                level="4"
                                range="30 à 49"
                                rate="3,5 %"
                                cap="850 F"
                                duration="12 mois"
                            />
                            <LevelRow
                                level="Gold"
                                range="50 et +"
                                rate="4 %"
                                cap="1 000 F"
                                duration="à vie"
                                gold
                            />
                        </tbody>
                    </table>
                </div>

                <p className="leading-relaxed text-sm text-gray-300">
                    Le décompte commence à la première réservation confirmée
                    parmi vos filleuls. Si vous montez de niveau pendant cette
                    fenêtre, la durée s'allonge automatiquement. Exemple :
                    niveau 1 = 4 mois ; si vous passez niveau 2 au mois 3, vous
                    avez en réalité 6 mois au total depuis votre première
                    réservation.
                </p>
                <p className="leading-relaxed text-sm text-gray-300">
                    Le niveau Gold ne se ferme jamais. Une fois 50 filleuls
                    actifs atteints, vous êtes payé à vie sur les
                    réservations de vos filleuls (4 %, plafonné à 1 000 F).
                </p>
            </section>

            {/* Section 4 — Retrait */}
            <section className="px-6 max-w-2xl mx-auto mt-10 space-y-4 text-gray-200">
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                    Pour retirer votre argent
                </h2>
                <ul className="space-y-2 text-sm">
                    <li className="flex gap-2">
                        <span className="text-brand-cyanLight">→</span>
                        <span>
                            Avoir au moins{" "}
                            <span className="font-semibold">3 filleuls</span>{" "}
                            inscrits avec votre code.
                        </span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-brand-cyanLight">→</span>
                        <span>
                            Avoir cumulé{" "}
                            <span className="font-semibold">
                                2 500 F CFA
                            </span>{" "}
                            de commission minimum.
                        </span>
                    </li>
                    <li className="flex gap-2">
                        <span className="text-brand-cyanLight">→</span>
                        <span>
                            Les paiements partent chaque{" "}
                            <span className="font-semibold">
                                vendredi et samedi
                            </span>
                            , sur le numéro Mobile Money que vous nous donnez.
                        </span>
                    </li>
                </ul>
            </section>

            {/* Section 5 — CTA */}
            <section
                id="cta"
                className="px-6 max-w-md mx-auto mt-12 pb-12 space-y-4 text-center"
            >
                <h2 className="text-xl font-bold text-white">
                    On y va ?
                </h2>
                <p className="text-sm text-gray-400">
                    Si vous avez déjà un compte Stay229 (voyageur ou
                    fournisseur), connectez-vous avec les mêmes identifiants.
                    Le rôle partenaire s'ajoute simplement à votre compte
                    existant. Sinon, l'inscription prend moins d'une minute.
                </p>

                <div className="flex flex-col gap-3 pt-2">
                    <Link
                        href="/signup"
                        className="rounded-xl px-6 py-3 bg-brand-cyan text-black font-semibold hover:opacity-90 transition"
                    >
                        Devenir partenaire
                    </Link>
                    <Link
                        href="/login"
                        className="rounded-xl px-6 py-3 border border-brand-cyan text-brand-cyan font-semibold hover:bg-brand-cyan/10 transition"
                    >
                        Se connecter
                    </Link>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed pt-3">
                    En vous inscrivant, vous reconnaissez avoir lu et accepté
                    les règles du programme d'affiliation Stay229. Stay229 se
                    réserve le droit de modifier le programme à tout moment,
                    d'ajuster les taux et plafonds pour les commissions à venir
                    (les commissions déjà acquises restent dues) et de
                    suspendre un partenaire en cas de fraude, comportement
                    abusif, ou non-respect de nos conditions générales.
                </p>

                <p className="text-xs text-gray-500 pt-4">
                    Une question ? Écrivez-nous à{" "}
                    <a
                        href="mailto:supportstay229@gmail.com"
                        className="text-brand-cyan hover:underline"
                    >
                        supportstay229@gmail.com
                    </a>
                </p>
            </section>
        </main>
    );
}

function LevelRow({
    level,
    range,
    rate,
    cap,
    duration,
    gold,
}: {
    level: string;
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
                {gold ? (
                    <span className="text-yellow-300">{level}</span>
                ) : (
                    level
                )}
            </td>
            <td className="px-3 py-2 text-gray-300">{range}</td>
            <td className="px-3 py-2 text-right text-gray-300">{rate}</td>
            <td className="px-3 py-2 text-right text-gray-300">{cap}</td>
            <td className="px-3 py-2 text-right text-gray-300">{duration}</td>
        </tr>
    );
}
