# Stay229 Partner Web

Mini-site Next.js pour les partenaires Stay229 (influenceurs, ambassadeurs). Permet à un partenaire de :

1. Créer un compte (email + mdp, infos personnelles, numéro MoMo de paiement).
2. Recevoir un **code promo unique** qu'il partage avec son audience.
3. Suivre dans un dashboard les commissions générées par ses filleuls :
   - **Réservation d'appartement (court séjour)** : **500 F XOF** par réservation confirmée — à vie.
   - **Visite longue durée** : aucune commission.
   - **Avantage filleul** : 10 % de réduction sur sa **première** réservation d'appartement s'il s'inscrit avec un code promo.

Connecté au même projet Supabase que les apps Android Stay229.

---

## Prérequis

- Node.js 18+ (testé sur 20)
- Compte Supabase avec les migrations `0014_referral_system.sql` ET `0015_referral_commission_update.sql` exécutées
- Compte Vercel (gratuit) pour le déploiement

---

## Démarrage local

```bash
cd Stay229PartnerWeb
cp .env.local.example .env.local
# Remplir SUPABASE_URL + SUPABASE_ANON_KEY dans .env.local
npm install
npm run dev
```

Ouvre http://localhost:3000.

---

## Déploiement Vercel (5 min)

1. Pousse ce dossier sur un repo GitHub (peut être un sous-répertoire d'un monorepo, ou un repo dédié).
2. Va sur https://vercel.com → **Add New → Project** → importe le repo.
3. Si c'est un monorepo, **Root Directory** = `Stay229PartnerWeb`.
4. Framework Preset : Next.js (auto-détecté).
5. **Environment Variables** :
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://irtsrjozknzpdugakrjc.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = ta clé anon Supabase (Dashboard → Project Settings → API → anon public)
6. **Deploy**.

URL par défaut : `https://stay229-partner-web.vercel.app` — tu peux ajouter un domaine custom (ex: `partenaires.stay229.bj`) depuis Vercel → Settings → Domains.

---

## Architecture

```
Stay229PartnerWeb/
├── app/
│   ├── layout.tsx          → racine + globals.css
│   ├── page.tsx            → landing (login / signup)
│   ├── login/page.tsx      → connexion email+mdp
│   ├── signup/page.tsx     → création compte partenaire + génération promo_code
│   ├── dashboard/page.tsx  → tableau de bord : code promo, totaux, détail commissions
│   └── globals.css
├── lib/
│   └── supabase.ts         → client + helper generatePromoCode()
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── next.config.js
└── .env.local.example
```

### Tables Supabase utilisées

(toutes créées par `0014_referral_system.sql` côté Stay229Android-Native/supabase/migrations)

- `partners` — un partenaire = un compte Supabase + infos perso + 1 code promo unique.
- `referrals` — N×1, lie un user filleul à un partenaire (immuable une fois posé).
- `partner_commissions` (vue) — détail des commissions par booking.
- `partner_commission_totals` (vue) — agrégats par partenaire.
- `find_partner_by_code(text) → uuid` (RPC) — utilisée par l'app Android pour valider un code à l'inscription.

### Sécurité

- Toutes les requêtes passent par les RLS Supabase. Un partenaire ne peut voir que ses propres référés et commissions.
- Pas de clé service-role utilisée côté front. Seule la clé `anon` est exposée.
- Le mot de passe partenaire est haché par Supabase Auth (jamais en clair côté DB).

---

## Maintenance

### Ajouter une langue (EN)

Next.js App Router supporte i18n via `next/navigation` + un dossier `[lang]/`. Le scope actuel est FR uniquement (cible Bénin) → pas implémenté.

### Modifier les règles de commission

Tout est dans la vue `partner_commissions` (migration 0014). Modifier la définition SQL, puis dans le SQL Editor :

```sql
create or replace view public.partner_commissions as …;
notify pgrst, 'reload schema';
```

La vue d'agrégat `partner_commission_totals` se met automatiquement à jour.

### Payer les partenaires

Pas d'intégration automatique des virements MoMo (FedaPay / MTN MoMo Disburse). Pour l'instant, paiement manuel sur la base du dashboard :

1. Connecte-toi au dashboard Supabase → Table Editor → `partner_commission_totals`.
2. Tu vois chaque partenaire avec `grand_total` et `momo_phone`.
3. Tu fais les virements MoMo à la main.
4. (À ajouter plus tard : table `payouts` avec montant + date pour historiser ce qui a été payé.)
