# 🏰 Valthera TCG

**Jeu de Cartes à Collectionner** basé sur l'univers médiéval fantastique de Valthera, un monde inspiré de Dungeons & Dragons.

![Valthera TCG](https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800)

## 🎮 Description

Valthera TCG est une plateforme de collection de cartes où chaque **série correspond à une campagne** de jeu de rôle. Collectionnez les personnages, créatures, lieux, objets et boss que vous avez rencontrés au fil de vos aventures !

### Types de cartes
- 👤 **Personnages** - Héros et PNJ mémorables
- 🐲 **Créatures** - Monstres et bêtes fantastiques
- 🏔️ **Lieux** - Endroits emblématiques de Valthera
- ⚔️ **Objets** - Armes, armures et artefacts magiques
- 📖 **Événements** - Moments clés des campagnes
- 💀 **Boss** - Antagonistes légendaires

### Raretés
- ⚪ Commune
- 🟢 Peu commune
- 🔵 Rare
- 🟣 Épique
- 🟡 Légendaire

## 🚀 Lancer le projet

### Prérequis
- Node.js 18+

### Installation

```bash
# Installer les dépendances
npm install

# Lancer en développement
npm run dev

# Build pour production
npm run build
```

Le site sera accessible sur `http://localhost:3000`

## 🐳 Déploiement Docker (Coolify)

Le projet est maintenant prêt pour un déploiement via `Dockerfile` (Coolify ou autre plateforme Docker):

- Dockerfile: [Dockerfile](Dockerfile)
- Nginx container config: [nginx/app.conf](nginx/app.conf)
- Variables d'environnement exemple: [.env.example](.env.example)

Variable clé côté frontend build:

- `VITE_API_BASE_URL` (URL de l'API PostgreSQL déployée)

## 🔄 Migration Supabase → PostgreSQL + Storage

Le runbook complet de migration (base PostgreSQL + buckets storage) est ici :

- [MIGRATION_SUPABASE_TO_POSTGRESQL.md](MIGRATION_SUPABASE_TO_POSTGRESQL.md)

## 🧩 Architecture cible (Coolify)

- Architecture de déploiement front + api + postgres:
	- [COOLIFY_TARGET_ARCHITECTURE.md](COOLIFY_TARGET_ARCHITECTURE.md)

- Backend API PostgreSQL (en cours de migration frontend):
	- [server/package.json](server/package.json)
	- [server/src/index.ts](server/src/index.ts)

Validation du flux atomique d'acceptation d'échange (API + PostgreSQL éphémère Docker):

- `cd server && npm run test:integration:trade`

## 🛠️ Stack technique

- **Frontend** : React 19 + TypeScript
- **Styling** : Tailwind CSS
- **Routing** : React Router DOM 7
- **Build** : Vite
- **Storage** : LocalStorage (temporaire)

## 📁 Structure

```
├── components/       # Composants réutilisables
│   └── CardView.tsx  # Affichage d'une carte
├── pages/            # Pages de l'application
│   ├── Landing.tsx   # Accueil
│   ├── SeriesBrowser.tsx # Exploration des campagnes
│   ├── Collection.tsx    # Collection utilisateur
│   ├── BoosterOpening.tsx # Ouverture de boosters
│   └── AdminPanel.tsx    # Gestion des cartes
├── services/         # Services
│   └── storageService.ts # Gestion du stockage
└── types.ts          # Types TypeScript
```

## ✨ Fonctionnalités

- [x] Système de boosters quotidiens
- [x] Collection personnelle avec progression
- [x] Navigation par campagne
- [x] Panneau d'administration
- [x] Design thématique médiéval
- [x] Cartes avec flip 3D
- [ ] Backend avec Supabase
- [ ] Authentification avec Auth0
- [ ] Système d'échange de cartes
- [ ] Deck building
- [ ] Mode combat

## 📜 Licence

Projet personnel - Univers Valthera © 2024
