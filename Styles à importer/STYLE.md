**Style Guide — Valthera TCG**

Résumé: Ce document rassemble les couleurs, polices, gradients, animations et bonnes pratiques pour reproduire le style Valthera dans une autre application.

**Palette de couleurs**

| Token | Valeur | Usage recommandé |
|---|---:|---|
| `valthera-950` | `#0D0705` | Fonds très sombres / base de gradient |
| `valthera-900` | `#1A0F08` | Fond principal, nav bg, scrollbar track |
| `valthera-800` | `#2D1B0E` | Sections / cartes sombres |
| `valthera-700` | `#4A2C17` | Bordures, accents |
| `valthera-600` | `#6B3D1F` | Accents, hover states |
| `valthera-500` | `#8B5A2B` | CTA, gradient start |
| `valthera-400` | `#C9A227` | Accent doré (branding) |
| `valthera-300` | `#D4AF37` | Or, highlights, légendaire |
| `valthera-200` | `#E8D5A3` | Texte secondaire |
| `valthera-100` | `#F5ECD7` | Texte clair par défaut |

Autres familles:

| Token | Valeur | Usage |
|---|---:|---|
| `blood-600` | `#8B0000` | Alertes / erreurs |
| `forest-700` | `#1B4D3E` | États actifs / success |
| `steel-600` | `#4A5568` | Texte neutre / composants |

Raretés (tokens `rarity.*`):
- `common`: `#9CA3AF`
- `uncommon`: `#22C55E`
- `rare`: `#3B82F6`
- `epic`: `#A855F7`
- `legendary`: `#D4AF37`

**Gradients et backgrounds**
- Background global: `linear-gradient(180deg, #0D0705 0%, #1A0F08 50%, #2D1B0E 100%)`
- Holographic overlay: gradient multicolore (utilisé pour effets holo sur cartes)

**Polices**
- Titre / display: `Cinzel` (Tailwind token: `font-medieval`) — utiliser pour titres, logos.
- Texte principal: `Crimson Text` (Tailwind token: `font-body`) — body copy et paragraphes.
- Import Google Fonts (exemple): `https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700;800&family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400&display=swap`

**Animations / effets**
- Key animations: `shake`, `float`, `shine`, `glow`, `fade-in`, `card-reveal`, `slide-up`, `pulse-gold`.
- Effets spéciaux: `legendaryShimmer`, `epicGlow`, `sparkleAnim`, `holoRainbow`.
- Recommandation d'utilisation: garder sparseness; heavy effects uniquement sur rare/legendary cards or hero CTAs.

**Classes utilitaires personnalisées**
- `.card-preserve-3d`, `.card-backface-hidden`, `.rotate-y-180` — pour cartes 3D.
- `.holographic-overlay`, `.epic-shimmer` — pour overlays de rareté.

**Accessibilité & contraste**
- Texte principal (`#F5ECD7`) sur fonds `valthera-900`/`800` atteint généralement un ratio élevé; vérifier contrastes pour petits textes.
- Éviter d'utiliser `valthera-100` (clair) sur `valthera-400` (dore) sans contraste suffisant.

**Exemples d'utilisation**
- Bouton principal: `bg-valthera-500 text-valthera-900` (ou gradient `from-valthera-500 to-valthera-600`).
- Badge légendaire: `bg-legendary/30 text-legendary` + `card-legendary` animation.

**Fichiers utiles**
- `index.html` contient la configuration Tailwind et définitions de base.
- `App.tsx`, `pages/*` montrent l'application des tokens dans les composants.

---

Si tu veux, je peux: 
- produire `design-tokens.json` (prêt à importer dans Figma/Style Dictionary),
- fournir `tailwind-theme.js` prêt à coller,
- exporter un CSV pour import dans d'autres outillages.

Dis-moi lesquels je génère en priorité.