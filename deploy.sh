#!/bin/bash
set -e

echo "🚀 Déploiement Valthera TCG..."

# Aller dans le dossier
cd /var/www/valthera-tcg

# Pull les dernières modifications
git pull origin main

# Installer les dépendances
npm install

# Builder l'application
npm run build

# Redémarrer PM2
pm2 restart valthera-tcg

echo "✅ Déploiement terminé !"
echo "🌐 https://valtheratcg.sourcekod.fr"
