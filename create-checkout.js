// netlify/functions/create-checkout.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Catalogue de prix (en cents CAD), indexé par la clé du panier.
const PRICES = {
  "p72": { name: "Nettoyant à cuvette (1 litre)", cents: 499 },
  "p73": { name: "Nettoyant à vadrouille humide (1 gallon)", cents: 1899 },
  "p3": { name: "Conteneur récup. d'aiguilles — 1,8 L", cents: 1299 },
  "p4": { name: "Stimulateur d'aiguilles 6 canaux", cents: 36593 },
  "p5": { name: "Stimulateur d'aiguilles 6 canaux — LCD", cents: 42500 },
  "p6": { name: "Désodorisant solide — Pack de 3", cents: 2199 },
  "p9": { name: "Système de pressothérapie à air — PT1002", cents: 69900 },
  "p11": { name: "Tampons antiseptiques à l'alcool 70% — Boîte de 1500", cents: 3950 },
  "p13": { name: "Planche d'équilibre — Rocker 20″", cents: 19999 },
  "p15": { name: "Coussin d'équilibre — Pro XL", cents: 14500 },
  "p16": { name: "Pansements adhésifs — 80 assortis", cents: 1399 },
  "p17": { name: "Bandage triangulaire coton — 40×40×56″", cents: 99 },
  "p18": { name: "Inclinomètre à bulle Baseline", cents: 9999 },
  "p19": { name: "Ruban à mesurer Baseline — 150 cm", cents: 675 },
  "p20": { name: "Siège de douche — Sécurité bain (blanc)", cents: 9999 },
  "p1": { name: "Masque d'isolation 3 plis — Bleu", cents: 1299 },
  "p21": { name: "Tensiomètre numérique de bras", cents: 6999 },
  "p23": { name: "Gel de soulagement froid — 113 g", cents: 1999 },
  "p31": { name: "Piles bouton AG13 / LR44 / 357 — Paquet de 10", cents: 699 },
  "p33": { name: "Traversin de massage rond — Bleu marine", cents: 5899 },
  "p34": { name: "Demi-ballon Bosu — Entraînement avec cordes de résistance", cents: 15110 },
  "p35": { name: "Bosu Pro — Plateau d'équilibre", cents: 24700 },
  "p36": { name: "Bosu Vestibular Dome — Plateau d'équilibre maison", cents: 19999 },
  "p37": { name: "Cloche d'appel chromée — 3 3/8\"", cents: 2299 },
  "p38": { name: "Poignée musculation ergonomique CanDo — Vert 12 lb (paire)", cents: 1325 },
  "p39": { name: "Filet d'exercice pour la main CanDo — 14\" Vert (medium)", cents: 3395 },
  "p40": { name: "Pâte d'exercice CanDo Theraputty — 2 oz Rouge (soft)", cents: 495 },
  "p41": { name: "Pâte d'exercice CanDo Theraputty — 2 oz Jaune (x-soft)", cents: 495 },
  "p42": { name: "Exerciseur de doigts CanDo Digi-Extend", cents: 2499 },
  "p45": { name: "Coussin d'équilibre gonflable CanDo", cents: 3525 },
  "p47": { name: "Ballon d'exercice gonflable CanDo — Orange 120 cm (48\")", cents: 10500 },
  "p49": { name: "Support plastique de rangement CanDo Digi-Flex", cents: 2330 },
  "p51": { name: "Poulie d'épaule sur porte CanDo (avec disque)", cents: 1899 },
  "p52": { name: "Tapis de yoga CanDo — 68\" x 24\" x 1/4\"", cents: 2499 },
  "p53": { name: "Balle de massage à picots CanDo — 10 cm (4\"), Bleu", cents: 2499 },
  "p54": { name: "Anneaux empileurs CanDo — Accessoire ballon (ensemble de 3)", cents: 3999 },
  "p56": { name: "Embouts souples de rechange CAT — Standard (paquet de 5)", cents: 3750 },
  "p57": { name: "Embout cervical CAT", cents: 3750 },
  "p58": { name: "Outil d'ajustement chiropratique CAT", cents: 25000 },
  "p59": { name: "Affiche anatomique — Le système musculaire", cents: 3999 },
  "p60": { name: "Affiche anatomique — Le système squelettique (laminée)", cents: 3999 },
  "p61": { name: "Affiches anatomiques — Points gâchettes (ensemble de 2)", cents: 5999 },
  "p62": { name: "Boules de coton (sac de 2000)", cents: 2760 },
  "p70": { name: "Essuie-mains multipli pliés — Brun · 16 paquets de 250", cents: 4999 },
  "p71": { name: "Essuie-mains multipli pliés — Blanc · 16 paquets de 250", cents: 4499 },
  "p63": { name: "Tampons ronds de coton biologique — 800 par boîte", cents: 2950 },
  "p64": { name: "Cramer Tuf-Skin — base de tapage 8 oz", cents: 3299 },
  "p65": { name: "Ensemble de poids de rééducation Cuff® — poignet et cheville (7 pièces)", cents: 25499 },
  "p66": { name: "Désinfectant et nettoyant — Savon à vaisselle (1 gallon)", cents: 1799 },
  "p67": { name: "Désinfectant et nettoyant — Bounce Fresh Linen, feuilles assouplissantes (200)", cents: 2999 },
  "p68": { name: "Désinfectant et nettoyant — Bounce sans parfum Free &amp; Gentle, feuilles assouplissantes (200)", cents: 2999 },
  "p69": { name: "Désinfectant et nettoyant — Papier hygiénique (120 rouleaux)", cents: 12840 },
  "p74": { name: "Désinfectant et nettoyant — Dettol antiseptique désinfectant liquide (1 L)", cents: 2999 },
  "p75": { name: "Désinfectant et nettoyant — Sacs à ordures 20 × 22 (500/caisse)", cents: 3599 },
  "p76": { name: "Désinfectant et nettoyant — Sacs à ordures 20 × 22 blanc (500/caisse)", cents: 3999 },
  "p77": { name: "Désinfectant et nettoyant — Sacs à ordures 22 × 24 (500/caisse)", cents: 3599 },
  "p78": { name: "Désinfectant et nettoyant — Sacs à ordures 26 × 36 (250/caisse)", cents: 3950 },
  "p79": { name: "Désinfectant pour les mains GermAway (250 ml)", cents: 899 },
  "p80": { name: "Désinfectant pour les mains DELON+ gel (980 ml)", cents: 1499 },
  "p81": { name: "Désinfectant pour les mains gel (1 gallon · 3,78 L)", cents: 3999 },
  "p82": { name: "Savon à mains antibactérien (1 gallon · 3,78 L)", cents: 1799 },
  "p83": { name: "Désinfectant et nettoyant — Détergent à lessive en poudre", cents: 3999 },
  "p84": { name: "Désinfectant et nettoyant — Lessive liquide (1 gallon · 3,78 L)", cents: 1699 },
  "p85": { name: "Désinfectant et nettoyant — Lingettes désinfectantes Lysol (80)", cents: 1999 },
  "p86": { name: "Désinfectant et nettoyant — Microgerme", cents: 5155 },
  "p87": { name: "Gants de nettoyage multiusage (paire)", cents: 399 },
  "p88": { name: "Désinfectant et nettoyant — Mouchoirs faciaux premium 3 plis", cents: 199 },
  "p89": { name: "Désinfectant et nettoyant — Cotons-tiges Q-Tips (paquet de 3 · 1875)", cents: 2999 },
  "p90": { name: "Savon à mains non parfumé (1 gallon · 3,78 L)", cents: 1799 },
  "p91": { name: "Couvre-appui-tête jetable", cents: 1499 },
  "p92": { name: "Couvre-appui-tête ajusté jetable", cents: 1499 },
  "p93": { name: "Rouleau non-tissé jetable pour table de massage", cents: 1100 },
  "p96": { name: "Draps d'examen jetables 40 × 48 po 2 plis (100/caisse)", cents: 6999 },
  "p97": { name: "Jaquettes d'examen jetables 30 × 42 po (50/caisse)", cents: 3599 },
  "p98": { name: "Gobelets en papier jetables 4 oz (500/boîte)", cents: 8999 },
  "p99": { name: "Papier d'appui-tête avec fente faciale 12 × 12 po (1000/boîte)", cents: 6999 },
  "p100": { name: "Table de massage électrique 29″ Royal-Treatment S29 — Charbon", cents: 255000 },
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
    const cart = body.cart;
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
    const origin = event.headers.origin || ("https://" + (event.headers.host || ""));
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items,
      shipping_address_collection: { allowed_countries: ["CA"] },
      success_url: origin + "/?paid=1",
      cancel_url: origin + "/?canceled=1",
    });
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message || "Erreur serveur." }) };
  }
};
