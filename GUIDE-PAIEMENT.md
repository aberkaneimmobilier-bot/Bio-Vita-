# Activer les vrais paiements par carte — Guide pas à pas

Ton site est statique. Pour encaisser de vrais paiements, on ajoute une petite
fonction serveur (gratuite chez Netlify) qui parle à Stripe. Le client paie sur
la page sécurisée de Stripe ; tu ne touches jamais aux numéros de carte.

Aucun produit à créer dans Stripe : les prix sont déjà inclus dans la fonction
(fichier `create-checkout.js`), recalculés côté serveur pour empêcher la fraude.

---

## Ce que contient ce dossier

- `netlify/functions/create-checkout.js` → la fonction de paiement (prix inclus)
- `netlify.toml` → config Netlify
- `package.json` → dépendance Stripe
- `1-remplacer-placeOrder.js.txt` → le code à coller dans ton index.html
- `GUIDE-PAIEMENT.md` → ce guide

---

## Étape 1 — Créer un compte Stripe (15 min)

1. Va sur https://dashboard.stripe.com/register
2. Crée ton compte, renseigne Voltix/ton entreprise, ton adresse au Québec et
   ton compte bancaire (pour recevoir les virements).
3. Laisse le **Mode test** activé (interrupteur en haut à droite) pour commencer.
4. Menu **Développeurs → Clés API**. Note les deux clés :
   - Clé publiable : `pk_test_...`
   - Clé secrète : `sk_test_...`  ← reste SECRÈTE, jamais dans le HTML.

---

## Étape 2 — Préparer les fichiers du site

1. Prends ton site (le dossier avec `index.html` et `assets/`).
2. Copie dedans, à la racine : `netlify.toml`, `package.json`, et le dossier
   `netlify/` complet (qui contient `functions/create-checkout.js`).
3. Ouvre `index.html`, remplace la fonction `placeOrder()` par le contenu de
   `1-remplacer-placeOrder.js.txt` (instructions en haut de ce fichier).
4. Sauvegarde.

Structure finale :
```
mon-site/
├── index.html
├── assets/
├── netlify.toml
├── package.json
└── netlify/
    └── functions/
        └── create-checkout.js
```

---

## Étape 3 — Mettre en ligne sur Netlify

Netlify Drop ne suffit pas pour les fonctions : il faut connecter un dépôt Git
OU utiliser l'outil en ligne de commande Netlify.

### Option simple : via GitHub + Netlify (recommandé)
1. Mets ton dossier sur GitHub (un dépôt, même privé).
2. Sur https://app.netlify.com → **Add new site → Import an existing project**.
3. Choisis ton dépôt GitHub. Laisse les réglages par défaut. **Deploy**.

### Option ligne de commande
```bash
npm install -g netlify-cli
cd mon-site
netlify init        # connecte/crée le site
netlify deploy --prod
```

---

## Étape 4 — Mettre ta clé secrète Stripe dans Netlify

1. Dans Netlify : **Site configuration → Environment variables**.
2. Ajoute une variable :
   - Nom : `STRIPE_SECRET_KEY`
   - Valeur : ta clé `sk_test_...`
3. **Redéploie** le site (Deploys → Trigger deploy) pour qu'elle soit prise en compte.

---

## Étape 5 — Tester (mode test)

1. Ouvre ton site, ajoute des produits au panier, va au paiement, clique Payer.
2. Tu es redirigé vers Stripe. Utilise la carte de TEST :
   - Numéro : `4242 4242 4242 4242`
   - Date : n'importe quelle date future (ex. 12/30)
   - CVC : n'importe quel 3 chiffres
   - Code postal : n'importe lequel
3. Le paiement réussit → retour sur ton site (`/?paid=1`).
4. Vérifie dans Stripe → **Paiements** que la transaction apparaît.

---

## Étape 6 — Passer en RÉEL

1. Dans Stripe, complète l'activation du compte (vérification d'identité,
   infos bancaires) si demandé.
2. Bascule le dashboard en **Mode Live** (interrupteur en haut à droite).
3. Récupère tes clés LIVE (**Développeurs → Clés API**) : `pk_live_...` / `sk_live_...`
4. Dans Netlify, remplace `STRIPE_SECRET_KEY` par la clé `sk_live_...` puis redéploie.
5. Fais un vrai achat test avec ta propre carte (tu pourras te rembourser).

C'est en ligne et tu encaisses pour de vrai.

---

## Notes utiles

- **Frais Stripe au Canada** : environ 2,9 % + 0,30 $ par transaction réussie
  (vérifie le tarif à jour sur stripe.com/en-ca/pricing). Pas de frais mensuels.
- **Taxes (TPS/TVQ)** : ta page affiche déjà une estimation. Pour que Stripe
  calcule et collecte les taxes officiellement, active **Stripe Tax** dans le
  dashboard, puis dé-commente la ligne `automatic_tax: { enabled: true }` dans
  `create-checkout.js`.
- **Livraison** : la fonction collecte l'adresse de livraison (Canada). Tu peux
  ajouter des frais de port fixes via les "shipping options" de Stripe — demande
  si tu veux ce réglage.
- **Confirmation de commande par email** : Stripe peut envoyer les reçus
  automatiquement (Dashboard → Réglages → Reçus clients). Pour traiter/expédier
  automatiquement les commandes, on ajoute un "webhook" — étape suivante quand tu
  seras prêt.
- **Sécurité des prix** : la fonction ignore tout prix venant du navigateur et
  recalcule à partir du SKU. Si tu changes un prix sur le site, pense à le mettre
  à jour aussi dans `create-checkout.js` (ou redemande-moi de régénérer la table).
