// netlify/functions/create-checkout.js
// Crée une session Stripe Checkout. Les prix sont recalculés ICI, côté serveur,
// à partir du SKU/clé envoyé par le panier. Le prix envoyé par le navigateur
// est IGNORÉ : impossible de tricher sur les montants.

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// ---- Catalogue de prix (généré depuis le site, en cents CAD) ----
const PRICES = {
  "VHC-BOWL-CLEANER-1L": { name: "Nettoyant à cuvette (1 litre)", cents: 499 },
  "VHC-DAMP-MOP-1GAL": { name: "Nettoyant à vadrouille humide (1 gallon)", cents: 1899 },
  "VHC-SHARPS-1.8L": { name: "Conteneur récup. d'aiguilles — 1,8 L", cents: 1299 },
  "VHC-STIM-CMNS6-1B": { name: "Stimulateur d'aiguilles 6 canaux", cents: 36593 },
  "VHC-STIM-IF6S": { name: "Stimulateur d'aiguilles 6 canaux — LCD", cents: 42500 },
  "VHC-AIR-3PK": { name: "Désodorisant solide — Pack de 3", cents: 2199 },
  "VHC-AIR-PRESS-PT1002": { name: "Système de pressothérapie à air — PT1002", cents: 69900 },
  "VHC-PREP-1500": { name: "Tampons antiseptiques à l'alcool 70% — Boîte de 1500", cents: 3950 },
  "VHC-BAL-ROCKER20": { name: "Planche d'équilibre — Rocker 20″", cents: 19999 },
  "VHC-BAL-PADXL": { name: "Coussin d'équilibre — Pro XL", cents: 14500 },
  "VHC-BANDAID-80": { name: "Pansements adhésifs — 80 assortis", cents: 1399 },
  "VHC-TRIBND": { name: "Bandage triangulaire coton — 40×40×56″", cents: 99 },
  "VHC-INCLINO": { name: "Inclinomètre à bulle Baseline", cents: 9999 },
  "VHC-TAPE150": { name: "Ruban à mesurer Baseline — 150 cm", cents: 675 },
  "VHC-BATHCHAIR": { name: "Siège de douche — Sécurité bain (blanc)", cents: 9999 },
  "VHC-MSK-3PLY-BL": { name: "Masque d'isolation 3 plis — Bleu", cents: 1299 },
  "VHC-BP-MON": { name: "Tensiomètre numérique de bras", cents: 6999 },
  "VHC-FREEZE-4OZ": { name: "Gel de soulagement froid — 113 g", cents: 1999 },
  "VHC-BAT-AG13-10": { name: "Piles bouton AG13 / LR44 / 357 — Paquet de 10", cents: 699 },
  "VHC-BOLSTER-RND": { name: "Traversin de massage rond — Bleu marine", cents: 5899 },
  "VHC-BOSU-HALF": { name: "Demi-ballon Bosu — Entraînement avec cordes de résistance", cents: 15110 },
  "VHC-BOSU-PRO": { name: "Bosu Pro — Plateau d'équilibre", cents: 24700 },
  "VHC-BOSU-DOME": { name: "Bosu Vestibular Dome — Plateau d'équilibre maison", cents: 19999 },
  "VHC-CALLBELL": { name: "Cloche d'appel chromée — 3 3/8\"", cents: 2299 },
  "VHC-HANDGRIP-GRN": { name: "Poignée musculation ergonomique CanDo — Vert 12 lb (paire)", cents: 1325 },
  "VHC-HANDWEB-GRN": { name: "Filet d'exercice pour la main CanDo — 14\" Vert (medium)", cents: 3395 },
  "VHC-PUTTY-RED": { name: "Pâte d'exercice CanDo Theraputty — 2 oz Rouge (soft)", cents: 495 },
  "VHC-PUTTY-YEL": { name: "Pâte d'exercice CanDo Theraputty — 2 oz Jaune (x-soft)", cents: 495 },
  "VHC-DIGIEXTEND": { name: "Exerciseur de doigts CanDo Digi-Extend", cents: 2499 },
  "VHC-BALANCEDISC": { name: "Coussin d'équilibre gonflable CanDo", cents: 3525 },
  "VHC-EXBALL-120": { name: "Ballon d'exercice gonflable CanDo — Orange 120 cm (48\")", cents: 10500 },
  "VHC-DIGIFLEX-RACK": { name: "Support plastique de rangement CanDo Digi-Flex", cents: 2330 },
  "VHC-PULLEY": { name: "Poulie d'épaule sur porte CanDo (avec disque)", cents: 1899 },
  "VHC-YOGAMAT": { name: "Tapis de yoga CanDo — 68\" x 24\" x 1/4\"", cents: 2499 },
  "VHC-MASSAGEBALL": { name: "Balle de massage à picots CanDo — 10 cm (4\"), Bleu", cents: 2499 },
  "VHC-STACKER": { name: "Anneaux empileurs CanDo — Accessoire ballon (ensemble de 3)", cents: 3999 },
  "VHC-CAT-TIPS": { name: "Embouts souples de rechange CAT — Standard (paquet de 5)", cents: 3750 },
  "VHC-CAT-CERVTIP": { name: "Embout cervical CAT", cents: 3750 },
  "VHC-CAT-TOOL": { name: "Outil d'ajustement chiropratique CAT", cents: 25000 },
  "VHC-CHART-MUSCLE": { name: "Affiche anatomique — Le système musculaire", cents: 3999 },
  "VHC-CHART-SKELETON": { name: "Affiche anatomique — Le système squelettique (laminée)", cents: 3999 },
  "VHC-CHART-TRIGGER": { name: "Affiches anatomiques — Points gâchettes (ensemble de 2)", cents: 5999 },
  "VHC-COTTONBALLS": { name: "Boules de coton (sac de 2000)", cents: 2760 },
  "VHC-TOWEL-BROWN-4000": { name: "Essuie-mains multipli pliés — Brun · 16 paquets de 250", cents: 4999 },
  "VHC-TOWEL-WHITE-4000": { name: "Essuie-mains multipli pliés — Blanc · 16 paquets de 250", cents: 4499 },
  "VHC-COTTON-ROUNDS": { name: "Tampons ronds de coton biologique — 800 par boîte", cents: 2950 },
  "VHC-TUFSKIN-8OZ": { name: "Cramer Tuf-Skin — base de tapage 8 oz", cents: 3299 },
  "VHC-CUFF-SET7": { name: "Ensemble de poids de rééducation Cuff® — poignet et cheville (7 pièces)", cents: 25499 },
  "VHC-DISH-1GAL": { name: "Désinfectant et nettoyant — Savon à vaisselle (1 gallon)", cents: 1799 },
  "VHC-BATHTISSUE-120": { name: "Désinfectant et nettoyant — Papier hygiénique (120 rouleaux)", cents: 12840 },
  "VHC-DETTOL-1L": { name: "Désinfectant et nettoyant — Dettol antiseptique désinfectant liquide (1 L)", cents: 2999 },
  "VHC-GARBAGE-20X22-500": { name: "Désinfectant et nettoyant — Sacs à ordures 20 × 22 (500/caisse)", cents: 3599 },
  "VHC-GARBAGE-20X22-WHT-500": { name: "Désinfectant et nettoyant — Sacs à ordures 20 × 22 blanc (500/caisse)", cents: 3999 },
  "VHC-GARBAGE-22X24-500": { name: "Désinfectant et nettoyant — Sacs à ordures 22 × 24 (500/caisse)", cents: 3599 },
  "VHC-GARBAGE-26X36-250": { name: "Désinfectant et nettoyant — Sacs à ordures 26 × 36 (250/caisse)", cents: 3950 },
  "VHC-SANITIZER-GERMAWAY-250": { name: "Désinfectant pour les mains GermAway (250 ml)", cents: 899 },
  "VHC-SANITIZER-DELON-980": { name: "Désinfectant pour les mains DELON+ gel (980 ml)", cents: 1499 },
  "VHC-SANITIZER-1GAL": { name: "Désinfectant pour les mains gel (1 gallon · 3,78 L)", cents: 3999 },
  "VHC-HANDSOAP-ANTIBAC-1GAL": { name: "Savon à mains antibactérien (1 gallon · 3,78 L)", cents: 1799 },
  "VHC-LAUNDRY-POWDER": { name: "Désinfectant et nettoyant — Détergent à lessive en poudre", cents: 3999 },
  "VHC-LAUNDRY-LIQUID-1GAL": { name: "Désinfectant et nettoyant — Lessive liquide (1 gallon · 3,78 L)", cents: 1699 },
  "VHC-LYSOL-WIPES-80": { name: "Désinfectant et nettoyant — Lingettes désinfectantes Lysol (80)", cents: 1999 },
  "VHC-MICROGERME": { name: "Désinfectant et nettoyant — Microgerme", cents: 5155 },
  "VHC-GLOVES-MULTI": { name: "Gants de nettoyage multiusage (paire)", cents: 399 },
  "VHC-TISSUE-3PLY": { name: "Désinfectant et nettoyant — Mouchoirs faciaux premium 3 plis", cents: 199 },
  "VHC-QTIPS-3PK": { name: "Désinfectant et nettoyant — Cotons-tiges Q-Tips (paquet de 3 · 1875)", cents: 2999 },
  "VHC-HANDSOAP-UNSC-1GAL": { name: "Savon à mains non parfumé (1 gallon · 3,78 L)", cents: 1799 },
  "VHC-HEADREST-COVER": { name: "Couvre-appui-tête jetable", cents: 1499 },
  "VHC-HEADREST-FITTED": { name: "Couvre-appui-tête ajusté jetable", cents: 1499 },
  "VHC-TABLE-ROLL": { name: "Rouleau non-tissé jetable pour table de massage", cents: 1100 },
  "VHC-EXAM-DRAPE-40X48": { name: "Draps d'examen jetables 40 × 48 po 2 plis (100/caisse)", cents: 6999 },
  "VHC-EXAM-GOWN-30X42": { name: "Jaquettes d'examen jetables 30 × 42 po (50/caisse)", cents: 3599 },
  "VHC-PAPERCUP-4OZ-500": { name: "Gobelets en papier jetables 4 oz (500/boîte)", cents: 8999 },
  "VHC-HEADREST-PAPER-1000": { name: "Papier d'appui-tête avec fente faciale 12 × 12 po (1000/boîte)", cents: 6999 },
  "VHC-TABLE-S29-CHARCOAL": { name: "Table de massage électrique 29″ Royal-Treatment S29 — Charbon", cents: 255000 },
  "alc|70%": { name: "Alcool isopropylique à friction — 70% & 99% — 70%", cents: 1299 },
  "alc|99%": { name: "Alcool isopropylique à friction — 70% & 99% — 99%", cents: 2699 },
  "wob|16\u2033": { name: "Planche d'équilibre — Wobble 16″ & 20″ — 16″", cents: 11995 },
  "wob|20\u2033": { name: "Planche d'équilibre — Wobble 16″ & 20″ — 20″", cents: 14000 },
  "dmb|12 unit\u00e9s": { name: "Ensemble d'haltères en vinyle — 12 unités", cents: 14499 },
  "dmb|20 unit\u00e9s": { name: "Ensemble d'haltères en vinyle — 20 unités", cents: 31499 },
  "dur|AAA": { name: "Piles Duracell — AAA", cents: 9400 },
  "dur|AA": { name: "Piles Duracell — AA", cents: 11000 },
  "dur|9 V": { name: "Piles Duracell — 9 V", cents: 16800 },
  "bed|Bleu": { name: "Draps de table jetables imperméables — Bleu", cents: 1299 },
  "bed|Blanc": { name: "Draps de table jetables imperméables — Blanc", cents: 1299 },
  "cup|1 paquet": { name: "Gobelets coniques jetables 4 oz (200/paquet) — 1 paquet", cents: 999 },
  "cup|5 paquets": { name: "Gobelets coniques jetables 4 oz (200/paquet) — 5 paquets", cents: 4495 },
  "cup|10 paquets": { name: "Gobelets coniques jetables 4 oz (200/paquet) — 10 paquets", cents: 7990 },
  "cup|25 paquets": { name: "Gobelets coniques jetables 4 oz (200/paquet) — 25 paquets", cents: 17475 },
  "dgf|Jaune (x-light)": { name: "Exerciseur main/doigts CanDo Digi-Flex — Jaune (x-light)", cents: 1999 },
  "dgf|Rouge (light)": { name: "Exerciseur main/doigts CanDo Digi-Flex — Rouge (light)", cents: 1999 },
  "dgf|Vert (medium)": { name: "Exerciseur main/doigts CanDo Digi-Flex — Vert (medium)", cents: 1999 },
  "dgf|Bleu (heavy)": { name: "Exerciseur main/doigts CanDo Digi-Flex — Bleu (heavy)", cents: 1999 },
  "dgf|Noir (x-heavy)": { name: "Exerciseur main/doigts CanDo Digi-Flex — Noir (x-heavy)", cents: 1999 },
  "gel|Tan (X-Soft)": { name: "Balle anti-stress en gel CanDo — Tan (X-Soft)", cents: 900 },
  "gel|Jaune (Soft)": { name: "Balle anti-stress en gel CanDo — Jaune (Soft)", cents: 900 },
  "gel|Rouge (Medium)": { name: "Balle anti-stress en gel CanDo — Rouge (Medium)", cents: 900 },
  "gel|Vert (Firm)": { name: "Balle anti-stress en gel CanDo — Vert (Firm)", cents: 900 },
  "gel|Bleu (X-Firm)": { name: "Balle anti-stress en gel CanDo — Bleu (X-Firm)", cents: 900 },
  "gel|Noir (XX-Firm)": { name: "Balle anti-stress en gel CanDo — Noir (XX-Firm)", cents: 900 },
  "gel|Ensemble de 6": { name: "Balle anti-stress en gel CanDo — Ensemble de 6", cents: 4500 },
  "exb|Blanc perle": { name: "Ballon d'exercice gonflable CanDo — Blanc perle", cents: 1999 },
  "exb|Rouge": { name: "Ballon d'exercice gonflable CanDo — Rouge", cents: 2299 },
  "exb|Vert": { name: "Ballon d'exercice gonflable CanDo — Vert", cents: 2599 },
  "exb|Bleu": { name: "Ballon d'exercice gonflable CanDo — Bleu", cents: 2999 },
  "exb|Jaune": { name: "Ballon d'exercice gonflable CanDo — Jaune", cents: 3399 },
  "bnd|Jaune (x-light)": { name: "Bande d'exercice CanDo (faible poudre) — Jaune (x-light)", cents: 1699 },
  "bnd|Rouge (light)": { name: "Bande d'exercice CanDo (faible poudre) — Rouge (light)", cents: 1699 },
  "bnd|Vert (medium)": { name: "Bande d'exercice CanDo (faible poudre) — Vert (medium)", cents: 1699 },
  "bnd|Bleu (heavy)": { name: "Bande d'exercice CanDo (faible poudre) — Bleu (heavy)", cents: 1699 },
  "bnd|Noir (x-heavy)": { name: "Bande d'exercice CanDo (faible poudre) — Noir (x-heavy)", cents: 1699 },
  "rol|Tan (xx-light)": { name: "Rouleau de bande d'exercice sans latex CanDo — Tan (xx-light)", cents: 9225 },
  "rol|Jaune (x-light)": { name: "Rouleau de bande d'exercice sans latex CanDo — Jaune (x-light)", cents: 10500 },
  "rol|Rouge (light)": { name: "Rouleau de bande d'exercice sans latex CanDo — Rouge (light)", cents: 13000 },
  "rol|Vert (medium)": { name: "Rouleau de bande d'exercice sans latex CanDo — Vert (medium)", cents: 16000 },
  "rol|Bleu (heavy)": { name: "Rouleau de bande d'exercice sans latex CanDo — Bleu (heavy)", cents: 20000 },
  "rol|Noir (x-heavy)": { name: "Rouleau de bande d'exercice sans latex CanDo — Noir (x-heavy)", cents: 25000 },
  "twb|Beige (xx-light)": { name: "Barre de résistance à torsion CanDo (Twist Bar) — Beige (xx-light)", cents: 2055 },
  "twb|Jaune (x-light)": { name: "Barre de résistance à torsion CanDo (Twist Bar) — Jaune (x-light)", cents: 2055 },
  "twb|Rouge (light)": { name: "Barre de résistance à torsion CanDo (Twist Bar) — Rouge (light)", cents: 2055 },
  "twb|Vert (medium)": { name: "Barre de résistance à torsion CanDo (Twist Bar) — Vert (medium)", cents: 2055 },
  "twb|Bleu (heavy)": { name: "Barre de résistance à torsion CanDo (Twist Bar) — Bleu (heavy)", cents: 2055 },
  "twb|Noir (x-heavy)": { name: "Barre de résistance à torsion CanDo (Twist Bar) — Noir (x-heavy)", cents: 2055 },
  "acu|0.22 x 13": { name: "Aiguilles d'acupuncture avec tube — Huanqiu — 0.22 x 13 mm", cents: 2875 },
  "acu|0.22 x 25": { name: "Aiguilles d'acupuncture avec tube — Huanqiu — 0.22 x 25 mm", cents: 2995 },
  "acu|0.25 x 13": { name: "Aiguilles d'acupuncture avec tube — Huanqiu — 0.25 x 13 mm", cents: 3095 },
  "acu|0.25 x 25": { name: "Aiguilles d'acupuncture avec tube — Huanqiu — 0.25 x 25 mm", cents: 3195 },
  "acu|0.25 x 30": { name: "Aiguilles d'acupuncture avec tube — Huanqiu — 0.25 x 30 mm", cents: 3295 },
  "acu|0.25 x 35": { name: "Aiguilles d'acupuncture avec tube — Huanqiu — 0.25 x 35 mm", cents: 3395 },
  "acu|0.30 x 30": { name: "Aiguilles d'acupuncture avec tube — Huanqiu — 0.30 x 30 mm", cents: 3495 },
  "acu|0.35 x 25": { name: "Aiguilles d'acupuncture avec tube — Huanqiu — 0.35 x 25 mm", cents: 3595 },
  "acu|0.35 x 40": { name: "Aiguilles d'acupuncture avec tube — Huanqiu — 0.35 x 40 mm", cents: 3795 },
  "acu|0.35 x 60": { name: "Aiguilles d'acupuncture avec tube — Huanqiu — 0.35 x 60 mm", cents: 4495 },
  "acu|0.45 x 100": { name: "Aiguilles d'acupuncture avec tube — Huanqiu — 0.45 x 100 mm", cents: 6495 },
  "wst|Small": { name: "Manchon de pressothérapie pour la taille — Small", cents: 7500 },
  "wst|Large": { name: "Manchon de pressothérapie pour la taille — Large", cents: 7500 },
  "arm|Single|Small": { name: "Manchon de pressothérapie pour bras — Single / Small", cents: 9900 },
  "arm|Single|Large": { name: "Manchon de pressothérapie pour bras — Single / Large", cents: 10500 },
  "arm|Double|Small": { name: "Manchon de pressothérapie pour bras — Double / Small", cents: 10900 },
  "arm|Double|Large": { name: "Manchon de pressothérapie pour bras — Double / Large", cents: 11500 },
  "leg|Single|Small": { name: "Manchon de pressothérapie pour jambe — Single / Small", cents: 9900 },
  "leg|Single|Large": { name: "Manchon de pressothérapie pour jambe — Single / Large", cents: 10500 },
  "leg|Double|Small": { name: "Manchon de pressothérapie pour jambe — Double / Small", cents: 10900 },
  "leg|Double|Large": { name: "Manchon de pressothérapie pour jambe — Double / Large", cents: 11500 }
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const cart = body.cart; // ex: [{ key: "VHC-...", qty: 2 }, { key: "dmb|12 unités", qty: 1 }]

    if (!Array.isArray(cart) || cart.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: "Panier vide." }) };
    }

    const line_items = [];
    for (const item of cart) {
      const ref = PRICES[item.key];
      const qty = parseInt(item.qty, 10);
      if (!ref) {
        return { statusCode: 400, body: JSON.stringify({ error: "Produit inconnu: " + item.key }) };
      }
      if (!Number.isInteger(qty) || qty < 1 || qty > 999) {
        return { statusCode: 400, body: JSON.stringify({ error: "Quantité invalide." }) };
      }
      line_items.push({
        price_data: {
          currency: "cad",
          product_data: { name: ref.name },
          unit_amount: ref.cents,
        },
        quantity: qty,
      });
    }

    // URL de base du site (success / cancel)
    const origin = event.headers.origin || ("https://" + (event.headers.host || ""));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,
      // Collecte de l'adresse de livraison (Canada)
      shipping_address_collection: { allowed_countries: ["CA"] },
      // Taxes automatiques (active Stripe Tax dans le dashboard si tu veux)
      // automatic_tax: { enabled: true },
      success_url: origin + "/?paid=1",
      cancel_url: origin + "/?canceled=1",
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Erreur serveur." }),
    };
  }
};
