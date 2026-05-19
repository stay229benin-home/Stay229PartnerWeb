# Stay229 Partenaires — HANDOFF technique

> **Mode d'emploi** : ouvre une nouvelle conversation Claude (Cowork) et dis « lis `C:\Users\DOSLIN\Stay229\Stay229PartnerWeb\HANDOFF.md` puis aide-moi avec X ».
> Ce document est conçu pour qu'une session Claude reprenne le contexte du système de parrainage sans avoir à fouiller l'historique de chat.

Dernière mise à jour : **2026-05-19** (système de paliers + multi-codes promo + menu de navigation, voir §3 et §5).

---

## 1. Vue d'ensemble

Stay229 a trois surfaces logicielles qui partagent **un seul backend Supabase** (`irtsrjozknzpdugakrjc`) :

| Surface | Tech | État | Dossier |
|---------|------|------|---------|
| **Stay229Android-Native** | Kotlin/Compose, app voyageur | 🟢 production (FedaPay KYC à finaliser) | `C:\Users\DOSLIN\Stay229\Stay229Android-Native` |
| **Stay229PartnerWeb** | Next.js 14 App Router, TypeScript, Tailwind | 🟢 mini-site partenaire | `C:\Users\DOSLIN\Stay229\Stay229PartnerWeb` |
| **Stay229ProviderAndroid-Native** | Kotlin/Compose, app hôte | ❌ pas commencé | `C:\Users\DOSLIN\Stay229\Stay229ProviderAndroid-Native` (à créer) |

Tout l'historique avant 2026-05-17 est dans `Stay229Android-Native/STATUS.md` et `Stay229Android-Native/HANDOFF.md`.

---

## 2. Architecture du programme de parrainage

### Acteurs

- **Partenaire** (influenceur, ambassadeur) : possède un compte `auth.users` séparé. Une ligne `partners` avec son `auth_user_id`, ses infos perso, son numéro MoMo de paiement et un `promo_code` unique (8 caractères alphanum majuscules, alphabet sans 0/O/1/I/L).
- **Client filleul** : compte `auth.users` standard côté app voyageur. À l'inscription il peut saisir un code promo qui le rattache à un partenaire via la table `referrals`.
- **Stay229 (Doslin)** : paie les commissions manuellement à partir du dashboard `partner_commission_totals`.

### Flux end-to-end

1. Partenaire signup sur le mini-site → `auth.signUp(email, password)` + INSERT dans `partners` (avec `promo_code` généré côté client par `lib/supabase.ts::generatePromoCode()`).
2. Partenaire partage son code promo sur ses réseaux.
3. Client s'inscrit dans l'app Android avec ce code → l'app appelle la RPC `find_partner_by_code(code)`, récupère le `partner_id`, puis INSERT dans `referrals(user_id, partner_id)`.
4. Client réserve un appartement long séjour → trigger SQL `trg_update_referral_first_booking` met à jour `referrals.first_booking_at` à la 1ère résa confirmée.
5. La vue `partner_commissions` matérialise une ligne par booking confirmé d'un filleul, avec son `commission_xof` calculé selon les règles ci-dessous.
6. La vue `partner_commission_totals` agrège tout par partenaire ; c'est ce que lit le dashboard du mini-site.

---

## 3. Règles de commission ⚠️ MISE À JOUR 2026-05-19 (migration 0017)

⚠️ **Attention à la terminologie Stay229** : dans cette codebase, "court séjour" = **réservation d'appartement** (`contact_code` commence par `CS`), et "long séjour" = **visite d'un logement à louer longue durée** (`contact_code` commence par `LS`, montant forfaitaire 2000 F).

### Modèle actuel (migration 0017)

Commission **VARIABLE** plafonnée, qui dépend du niveau du partenaire :

| Niveau | Filleuls actifs* | Taux | Plafond | Durée payée** |
|--------|------------------|------|---------|---------------|
| 1 | 1 à 5 | 3 % | 700 F | 4 mois |
| 2 | 6 à 14 | 3 % | 700 F | 6 mois |
| 3 | 15 à 29 | 3 % | 700 F | 9 mois |
| 4 | 30 à 49 | 3,5 % | 850 F | 12 mois |
| 5 (Gold) | 50 et + | 4 % | 1000 F | à vie |

\* **Filleul actif** = filleul ayant fait au moins une réservation d'appartement confirmée (CS). Compté via la vue `partner_levels.confirmed_filleul_count`.

\*\* La durée est mesurée depuis la **1ʳᵉ réservation CONFIRMÉE** parmi *n'importe lequel* des filleuls du partenaire (champ `partner_levels.first_commission_booking_at`). Si le partenaire change de niveau pendant cette fenêtre, la nouvelle durée du niveau s'applique → la fenêtre s'allonge automatiquement.

Formule de la commission (vue `partner_commissions` de la migration 0017) :

```
commission_xof = min(total_price * commission_rate, commission_cap)
                 si kind = 'short' ET on est dans la fenêtre, sinon 0.
```

Le niveau Gold n'a pas de fenêtre (`commission_duration = NULL`) → paiement à vie.

### Visites longue durée (LS)

Toujours **0 F** de commission par design. Doslin ne veut pas rémunérer les visites — seules les vraies réservations d'appartement comptent.

### Avantage client (filleul)

Inchangé depuis 0015 : **-10 % sur la 1ère réservation d'appartement** si le client a un code promo valide à l'inscription ET qu'il n'a pas encore confirmé de booking (`referrals.first_booking_at IS NULL`). RPC `referral_discount_eligible(p_user_id)` toujours en place.

### Avantage client (filleul)

- **-10 % sur la 1ère réservation d'appartement** : si le client a un code promo valide à l'inscription ET qu'il n'a pas encore confirmé de booking (`referrals.first_booking_at IS NULL`), l'app Android applique -10 % sur le total au moment du paiement.
- **Implémentation** : la RPC `referral_discount_eligible(p_user_id uuid) returns boolean` (migration 0015) renvoie `true` si éligible. Côté Android :
  - `BookingsRepository.isReferralDiscountEligible()` appelle la RPC.
  - `BookingViewModel` charge cette valeur au mount et stocke dans `BookingUiState.referralDiscountEligible`.
  - Si `true` ET booking != visite → `total = baseTotal * 0.90`.
  - `BookingScreen::PriceBreakdown` affiche une ligne "Réduction parrainage -10 %" visible.

### Pourquoi le filleul n'a PAS la remise sur les visites

Doslin veut que la remise serve à attirer des vraies réservations d'appartement, pas à brader le frais de visite de 2000 F. Décision : dans `BookingViewModel.submit()`, la branche `isVisit` garde `total = Visit.FEE_XOF` sans appliquer le facteur 0.90.

---

### Conditions de retrait (informatives, traitées côté UI)

- ≥ 3 filleuls liés (`affiliated_count`)
- ≥ 2 500 F XOF cumulés (`grand_total`)
- Paiements manuels chaque **vendredi** et **samedi** sur le numéro MoMo du partenaire

Le booléen `partner_commission_totals.can_withdraw` matérialise ces deux premières conditions. Le dashboard l'utilise pour afficher un bandeau vert "Vous pouvez retirer" si OK, sinon liste les conditions manquantes.

---

## 4. Schéma SQL (migrations 0014 + 0015 + 0017)

### Rappel des codes de booking (cf `BookingCodeGenerator.kt`)

- `CSXXXXXX` = **C**ourt **S**éjour = réservation d'un **appartement** (durée courte, paiement à la nuit/24H)
- `LSXXXXXX` = **L**ong **S**éjour = **visite** d'un logement disponible à la location longue durée (frais forfaitaire 2000 F XOF)

### Tables (migration 0014)

```sql
public.partners (
  id uuid pk,
  auth_user_id uuid unique references auth.users,
  prenom text, nom text, birthdate date,
  whatsapp text, momo_phone text,
  promo_code text unique check (length 5..15, [A-Z0-9]),
  is_active bool, created_at timestamptz
)

public.referrals (
  user_id uuid pk references auth.users,
  partner_id uuid references partners,
  linked_at timestamptz,
  first_booking_at timestamptz  -- NULL tant que pas réservé
)
```

### Vues (migration 0017 remplace 0015)

```sql
-- Nouvelle table : multi-codes promo par partenaire (migration 0017)
public.partner_promo_codes (
  id uuid pk,
  partner_id uuid references partners,
  code text unique check(...),
  platform text,        -- facultatif (Instagram, TikTok, …)
  profile_url text,     -- facultatif
  label text,           -- libellé interne du partenaire
  is_active bool,
  created_at timestamptz
)

-- Vue niveau / taux / plafond / fenêtre par partenaire (migration 0017)
public.partner_levels (
  partner_id, confirmed_filleul_count, first_commission_booking_at,
  level (1..5), commission_rate, commission_cap,
  commission_duration interval   -- NULL si niveau 5 (à vie)
)

-- 1 ligne par booking confirmé d'un filleul, recalculée à la lecture
public.partner_commissions (
  booking_id, partner_id, filleul_user_id, kind ('long'|'short'|'unknown'),
  booking_at, total_price, contact_code,
  partner_level,
  commission_xof  -- min(total*rate, cap) si dans la fenêtre, sinon 0
)

-- agrégat par partenaire (ajoute les champs de paliers + can_withdraw)
public.partner_commission_totals (
  partner_id, auth_user_id, prenom, nom, promo_code, whatsapp, momo_phone,
  affiliated_count, confirmed_filleul_count,
  partner_level, commission_rate, commission_cap,
  first_commission_booking_at, commission_ends_at,
  short_stay_total, long_stay_total (=0), grand_total,
  can_withdraw  -- bool : affiliated_count>=3 ET grand_total>=2500
)
```

### Trigger (migration 0017)

```sql
trg_sync_primary_promo_code  -- insère partners.promo_code dans partner_promo_codes
                              -- automatiquement à chaque nouveau partenaire
```

### RPC

```sql
find_partner_by_code(code text) returns uuid
    -- migration 0014, REMPLACÉE par 0017 : cherche maintenant dans
    -- partner_promo_codes (qui contient tous les codes, primaires inclus)
referral_discount_eligible(p_user_id uuid) returns boolean  -- migration 0015
```

### RLS

- `partners` : un partenaire ne voit/modifie que sa propre ligne (`auth_user_id = auth.uid()`). Insert autorisé pour son propre `auth_user_id`.
- `referrals` : insert autorisé si `user_id = auth.uid()` (pose de la liaison au signup). Le client lit la sienne, le partenaire lit celles qui pointent vers lui.
- `partner_promo_codes` (migration 0017) : SELECT / INSERT / UPDATE / DELETE autorisés uniquement si la ligne `partners` correspondante appartient à `auth.uid()`. → un partenaire gère ses propres codes, point.
- `partner_commissions` / `partner_commission_totals` / `partner_levels` : lecture pour `authenticated` (les RLS des tables sous-jacentes filtrent).

---

## 5. Mini-site (`Stay229PartnerWeb`)

### Stack

- Next.js 14 App Router + TypeScript + Tailwind
- `@supabase/ssr` + `@supabase/supabase-js` v2 — session stockée en cookies
- Routes : `/`, `/login`, `/signup`, `/complete`, `/dashboard`, `/promo-codes`, `/rules`
- Composant partagé `components/TopMenu.tsx` (barre de navigation supérieure pour les routes authentifiées — Dashboard / Codes promo / Règles / Contact + bouton déconnexion + burger mobile). Il est inclus dans `app/layout.tsx` et s'auto-cache sur `/`, `/login`, `/signup` ainsi que pour les visiteurs non authentifiés.

### Variables d'environnement

⚠️ **Bug "invalid key" rencontré le 2026-05-18** : le `.env.local` initial contenait le placeholder `ta_clef_anon_ici` dans `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Fixé en mettant la vraie clé. Le fichier actuel (déjà committé) :

```env
NEXT_PUBLIC_SUPABASE_URL=https://irtsrjozknzpdugakrjc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3Mi…
```

Sur Vercel : ces 2 variables doivent être ajoutées dans Project Settings → Environment Variables (Production + Preview + Development tous cochés).

### Dashboard — refactor 2026-05-19 (paliers)

- Bandeau de niveau en haut : libellé (Niveau 1 / 2 / 3 / 4 / Gold), commission appliquée (`X % · max Y F`), filleuls actifs + nombre restant avant le prochain palier, fenêtre de paiement (date de fin ou "à vie").
- Code promo principal affiché en grand + lien vers `/promo-codes` pour gérer les codes additionnels.
- Stat cards : Filleuls liés / Filleuls actifs / Commission cumulée (avec helper qui rappelle taux et plafond du niveau actuel).
- Bandeau retrait : vert "Vous pouvez retirer" si `can_withdraw = true`, sinon liste les conditions manquantes (3 filleuls, 2 500 F, ven/sam).
- Détail : `partner_commissions` filtré `kind = 'short'`, 100 dernières lignes.

### Page `/promo-codes` (nouvelle, 2026-05-19)

Gestion des multi-codes. Liste tous les codes du partenaire depuis `partner_promo_codes`, badge "Principal" sur le code primaire (non modifiable). Formulaire de création :
- mode auto-généré (8 caractères, alphabet sans 0/O/1/I/L) ou personnalisé,
- plateforme facultative (select Instagram/TikTok/WhatsApp/.../"Autre" → champ libre),
- URL profil facultative,
- libellé interne facultatif.

Possibilité d'activer/désactiver ou supprimer un code (sauf le principal).

### Page `/rules` (nouvelle, 2026-05-19)

Page statique server-rendered qui détaille le programme : calcul commission, exemples chiffrés, tableau des 5 paliers, conditions de retrait, suspension / fraude / modifications, contact support.

### Signup — pas de changement de logique côté front

Le flow signup ne change pas : `auth.signUp(email, password)` → Edge Function `create-partner` → INSERT `partners`. RLS s'occupe du reste. Le trigger SQL `trg_sync_primary_promo_code` (migration 0017) se charge automatiquement de répliquer `partners.promo_code` dans `partner_promo_codes`, donc **l'Edge Function n'a PAS besoin d'être modifiée**.

---

## 6. App Android — modifications 2026-05-18

### Fichiers touchés

```
app/src/main/java/com/stay229benin/Stay229/
├── domain/repository/BookingsRepository.kt        [+ isReferralDiscountEligible()]
├── data/repository/BookingsRepositoryImpl.kt      [+ implémentation via RPC]
├── feature/booking/BookingViewModel.kt            [+ flag dans UiState, calcul -10%]
└── feature/booking/BookingScreen.kt               [+ ligne "Réduction parrainage" dans PriceBreakdown]
```

### Détails clés

- `isReferralDiscountEligible()` est **best-effort** : retourne `false` si la migration 0015 n'est pas encore appliquée, si offline, etc. Mieux vaut sous-appliquer la remise que la sur-appliquer.
- Le `total_price` envoyé à `bookings` inclut déjà la remise — pas de colonne "discount" séparée en DB. Pas de tracking explicite côté SQL non plus (la remise est implicite dans le total). Si on veut tracer plus tard, ajouter une colonne `bookings.discount_amount` + colonne `referral_id`.
- Le trigger `trg_update_referral_first_booking` pose `first_booking_at` à la 1ère résa **confirmed** (status passe à `confirmed`). Donc la prochaine résa du filleul ne sera plus éligible à la remise.
- ⚠️ Edge case : si le booking est annulé après application de la remise, `first_booking_at` reste posé → le client ne récupère pas son éligibilité. Acceptable v1, à reconsidérer si Doslin remonte.

---

## 7. Vérifications post-déploiement

### Côté Supabase (SQL Editor)

```sql
-- 1. Migration 0017 bien appliquée ?
select count(*) from public.partner_promo_codes;          -- doit marcher
select * from public.partner_levels limit 1;              -- doit marcher

-- 2. La vue partner_commissions a-t-elle la nouvelle formule (3 % / cap) ?
select definition from pg_views where viewname = 'partner_commissions';
-- Doit contenir "least(... * pl.commission_rate, pl.commission_cap)"
-- NE doit PAS contenir "then 500.0::numeric"

-- 3. Backfill : chaque partenaire existant a-t-il sa ligne primaire dans
--    partner_promo_codes ?
select p.promo_code, ppc.code
  from public.partners p
  left join public.partner_promo_codes ppc on ppc.code = p.promo_code;
-- Tous les ppc.code doivent être non-NULL.

-- 4. RPC find_partner_by_code lit-elle bien la nouvelle table ?
select public.find_partner_by_code('XXXXXXXX');  -- code d'un partenaire test

-- Si erreur "function does not exist" :
notify pgrst, 'reload schema';
```

### Côté mini-site

1. `npm run dev` → http://localhost:3000 → /
2. La landing doit montrer le tableau des 5 paliers et le bouton "Devenir partenaire".
3. Créer un compte → vérifier redirection vers /dashboard.
4. Le dashboard doit afficher :
   - Bandeau "Niveau 1" (puisque 0 filleul actif) avec "3 % · max 700 F"
   - Code promo principal en grand
   - 3 stat cards (Filleuls liés / Filleuls actifs / Commission cumulée)
   - Bandeau gris listant les 3 conditions de retrait
5. Cliquer sur "Codes promo" dans le menu → la page /promo-codes liste le code principal avec badge "Principal" et permet d'en créer d'autres.
6. Cliquer sur "Règles" → la page /rules s'affiche.

### Côté app Android

1. Inscrire un compte test avec le code promo généré ci-dessus
2. Vérifier en DB : `select * from referrals where user_id = '<uuid>'` → ligne présente, `first_booking_at` NULL
3. Lancer le flow de réservation d'appartement (court séjour, CS%) → l'écran de récap doit montrer "Réduction parrainage -10%" en ligne séparée. **Note** : sur une visite (longue durée, 2000 F forfaitaire), la remise n'apparaît PAS (par design).
4. Confirmer la réservation → `bookings.total_price` = montant après remise
5. En DB : `select * from referrals` → `first_booking_at` est maintenant rempli
6. Réessayer une 2ème réservation → la remise ne s'applique plus (PriceBreakdown ne montre plus la ligne)

---

## 8. Reprises de session — questions fréquentes

### « Doslin a une erreur "Invalid API key" sur le site »

100 % des cas : la variable `NEXT_PUBLIC_SUPABASE_ANON_KEY` n'est pas remplie (vide ou placeholder). Vérifier :
- En local : fichier `Stay229PartnerWeb/.env.local`
- En prod : Vercel → Settings → Environment Variables

### « Could not find the 'consent_accepted_at' column of 'profiles' in the schema cache »

Bug rencontré le 2026-05-18 par Doslin sur l'app Android voyageur (inscription). La table `profiles` du projet Supabase n'a pas été créée par une migration de ce repo (elle est listée comme "hypothèse pré-existante" dans 0001_phase2_schema.sql), donc les colonnes RGPD que l'app insère n'existent pas dans le schéma.

**Fix** : exécuter `migrations/0016_profiles_rgpd_columns.sql` qui ajoute via `ALTER TABLE` :
- `consent_accepted_at timestamptz`
- `privacy_policy_version text`
- `terms_version text`

La migration est idempotente (`add column if not exists`).

### « violates foreign key constraint partners_auth_user_id_fkey »

Bug rencontré le 2026-05-18 par Doslin. Cause : Supabase a un mode anti-énumération qui retourne un user ID factice depuis `signUp()` quand soit (a) l'email est déjà utilisé, soit (b) « Confirm email » est activé. L'INSERT dans `partners` cherche alors un `auth.users` qui n'existe pas → FK violation.

**Fix structurel** (déjà fait côté front dans `signup/page.tsx` 2026-05-18) :
1. Après `signUp`, si pas de session → tenter `signInWithPassword` immédiatement.
2. Si toujours pas de session → message d'erreur qui dirige vers la bonne action (désactiver Confirm email ou utiliser /login).
3. Récupérer le `authUserId` via `getUser()` après session établie (et non depuis `signUp.user.id` qui peut être factice).
4. Skip l'INSERT si le partner existe déjà pour ce user.

**Action manuelle requise côté Supabase** :
- Désactiver « Confirm email » : Dashboard → Authentication → Providers → Email → décocher "Confirm email" → Save.
- Si un utilisateur fantôme bloque un email réel : Dashboard → Authentication → Users → supprimer le fantôme.

### « Les commissions ne s'affichent pas »

Ordre de check :
1. Migration 0014 + 0015 exécutées ? (`select count(*) from public.partner_commissions` doit marcher)
2. Le filleul a-t-il une ligne `referrals` ? (`select * from referrals where user_id = ...`)
3. Le filleul a-t-il un booking en `status = 'confirmed'` ? (sinon rien à matérialiser)
4. Le `contact_code` du booking commence-t-il par `CS` ? (les `LS` / visites génèrent 0 F par design)
5. Cache PostgREST stale → `notify pgrst, 'reload schema'`.

### « ERROR: cannot drop view partner_commissions because other objects depend on it » au moment d'appliquer 0017

C'était un bug de la 1ʳᵉ version de 0017 — corrigé le 2026-05-19. Le `DROP VIEW partner_commissions` devait être précédé de `DROP VIEW partner_commission_totals` (totals dépend de commissions). La version actuelle du fichier `0017_referral_levels_and_multi_codes.sql` fait les deux DROP dans le bon ordre (section 6).

Si tu vois encore cette erreur, soit ta copie locale n'est pas à jour, soit tu l'as exécutée à la main sans les deux DROP. Solution rapide depuis le SQL Editor Supabase :

```sql
drop view if exists public.partner_commission_totals;
drop view if exists public.partner_commissions;
-- puis relancer 0017 en entier
```

### « Comment changer les taux, plafonds ou paliers »

Tout est dans la vue `partner_levels` (migration 0017) :

```sql
-- Pour changer un taux ou un plafond, édite les expressions CASE de
-- partner_levels.commission_rate / commission_cap / commission_duration,
-- puis re-exécute la migration 0017 dans Supabase SQL Editor.

-- Pour changer les seuils de filleuls par palier (ex: 1-5 → 1-10) édite
-- les expressions CASE qui regardent `confirmed_filleul_count >= X`.

-- Après modification :
notify pgrst, 'reload schema';
```

Pas besoin de re-déployer le mini-site ni l'app — la vue est recalculée à chaque lecture. Les commissions déjà acquises (paid out) ne sont pas affectées rétroactivement par un changement de règles à venir parce qu'on paie manuellement, mais ATTENTION : les commissions affichées dans le dashboard sont recalculées en temps réel, donc un changement de règle modifiera la valeur de `grand_total` pour les bookings passés tant qu'ils n'ont pas été payés. Si tu veux figer historiquement, il faudra ajouter une table `paid_commissions` qui snapshot les valeurs au moment du paiement.

### « Comment changer le seuil de retrait (3 filleuls, 2500 F) »

Édite la dernière clause de la vue `partner_commission_totals` (champ `can_withdraw`), puis `notify pgrst, 'reload schema'`. Pense aussi à mettre à jour les textes des pages `/`, `/rules` et `/dashboard` côté front.

### « Comment ajouter le paiement automatique aux partenaires »

Pas implémenté v1. Roadmap :
- Créer une table `payouts(id, partner_id, amount, paid_at, momo_ref)`.
- Edge Function `pay_partner` qui appelle MTN MoMo Disburse API (ou FedaPay).
- UI admin (Supabase Studio ou page protégée du mini-site) pour déclencher les payouts batch.

---

## 9. Chemins importants

```
C:\Users\DOSLIN\Stay229\
├── Stay229Android-Native\
│   ├── HANDOFF.md, STATUS.md       (historique général)
│   ├── supabase/migrations/
│   │   ├── 0014_referral_system.sql                       (système de base)
│   │   ├── 0015_referral_commission_update.sql            (refonte 500 F fixe)
│   │   └── 0017_referral_levels_and_multi_codes.sql   ← ⭐ NOUVEAU (paliers + multi-codes)
│   └── app/src/main/java/com/stay229benin/Stay229/
│       ├── data/repository/BookingsRepositoryImpl.kt    ← modifié 2026-05-18
│       ├── domain/repository/BookingsRepository.kt      ← modifié 2026-05-18
│       └── feature/booking/
│           ├── BookingViewModel.kt    ← modifié 2026-05-18
│           └── BookingScreen.kt       ← modifié 2026-05-18
└── Stay229PartnerWeb\
    ├── HANDOFF.md                  ← ce fichier (mis à jour 2026-05-19)
    ├── MANUEL_DEPLOIEMENT.html     ← version utilisateur (Doslin) — mis à jour 2026-05-19
    ├── README.md
    ├── .env.local                  ← clé Supabase corrigée 2026-05-18
    ├── components/
    │   └── TopMenu.tsx             ← NOUVEAU 2026-05-19 (barre de nav supérieure)
    ├── app/
    │   ├── layout.tsx              ← inclut TopMenu
    │   ├── page.tsx                ← landing refondue 2026-05-19 (paliers + CTA + CGU)
    │   ├── login/page.tsx
    │   ├── signup/page.tsx
    │   ├── complete/page.tsx
    │   ├── dashboard/page.tsx      ← refondu 2026-05-19 (niveau, fenêtre, retrait)
    │   ├── promo-codes/page.tsx    ← NOUVEAU 2026-05-19 (gestion multi-codes)
    │   └── rules/page.tsx          ← NOUVEAU 2026-05-19 (règles détaillées)
    └── lib/supabase.ts             ← ajout helpers multi-codes 2026-05-19
```

Fin du document.
