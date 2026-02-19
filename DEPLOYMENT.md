# 🚀 Guide de Déploiement - Valthera TCG

## Configuration

- **Domaines** : `valtheratcg.sourcekod.fr` et `www.valtheratcg.sourcekod.fr`
- **Port** : `3004` (évite les conflits avec 3000-3003)
- **Serveur** : NGINX (reverse proxy) + PM2
- **Type** : Application React (SPA) servie via Vite Preview

---

## 📋 Prérequis

```bash
# Node.js 18+ et npm
node -v
npm -v

# PM2 installé globalement
npm install -g pm2

# NGINX installé
nginx -v
```

---

## 📦 1. Installation et Build

```bash
# Cloner ou transférer le projet sur le serveur
cd /var/www
git clone <repo-url> valthera-tcg
# ou scp -r ./Valthera-TCG user@server:/var/www/valthera-tcg

# Aller dans le dossier
cd /var/www/valthera-tcg

# Installer les dépendances
npm install

# Builder l'application
npm run build
```

---

## ⚙️ 2. Configuration PM2

### Option A : Servir avec Vite Preview (recommandé pour SPA)

Créer le fichier `ecosystem.config.cjs` :

```javascript
module.exports = {
  apps: [{
    name: 'valthera-tcg',
    script: 'npm',
    args: 'run preview -- --port 3004 --host 0.0.0.0',
    cwd: '/var/www/valthera-tcg',
    env: {
      NODE_ENV: 'production',
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    error_file: '/var/log/pm2/valthera-tcg-error.log',
    out_file: '/var/log/pm2/valthera-tcg-out.log',
    time: true,
  }]
};
```

### Option B : Servir avec serve (fichiers statiques)

```bash
# Installer serve globalement
npm install -g serve
```

```javascript
module.exports = {
  apps: [{
    name: 'valthera-tcg',
    script: 'serve',
    args: '-s dist -l 3004',
    cwd: '/var/www/valthera-tcg',
    env: {
      NODE_ENV: 'production',
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    error_file: '/var/log/pm2/valthera-tcg-error.log',
    out_file: '/var/log/pm2/valthera-tcg-out.log',
    time: true,
  }]
};
```

### Lancer PM2

```bash
# Créer le dossier de logs si nécessaire
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2

# Démarrer l'application
pm2 start ecosystem.config.cjs

# Vérifier le statut
pm2 status

# Configurer le démarrage automatique au boot
pm2 save
pm2 startup
```

---

## 🌐 3. Configuration NGINX

Créer le fichier `/etc/nginx/sites-available/valtheratcg.sourcekod.fr` :

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name valtheratcg.sourcekod.fr www.valtheratcg.sourcekod.fr;

    # Redirection HTTP -> HTTPS (décommenter après certbot)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://127.0.0.1:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # Cache des assets statiques
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:3004;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;
    gzip_comp_level 6;
}
```

### Activer le site

```bash
# Créer le lien symbolique
sudo ln -s /etc/nginx/sites-available/valtheratcg.sourcekod.fr /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Recharger NGINX
sudo systemctl reload nginx
```

---

## 🔒 4. SSL avec Let's Encrypt (Certbot)

```bash
# Installer certbot si pas déjà fait
sudo apt install certbot python3-certbot-nginx

# Obtenir le certificat SSL
sudo certbot --nginx -d valtheratcg.sourcekod.fr -d www.valtheratcg.sourcekod.fr

# Le certificat sera auto-renouvelé, vérifier le cron
sudo certbot renew --dry-run
```

### Configuration NGINX avec SSL (générée par certbot)

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name valtheratcg.sourcekod.fr www.valtheratcg.sourcekod.fr;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name valtheratcg.sourcekod.fr www.valtheratcg.sourcekod.fr;

    ssl_certificate /etc/letsencrypt/live/valtheratcg.sourcekod.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/valtheratcg.sourcekod.fr/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        proxy_pass http://127.0.0.1:3004;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:3004;
        proxy_set_header Host $host;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;
    gzip_comp_level 6;
}
```

---

## 🔧 5. Configuration Auth0 (IMPORTANT)

Dans le dashboard Auth0, ajouter les URLs de production :

### Application Settings > Allowed Callback URLs
```
https://valtheratcg.sourcekod.fr, https://www.valtheratcg.sourcekod.fr
```

### Application Settings > Allowed Logout URLs
```
https://valtheratcg.sourcekod.fr, https://www.valtheratcg.sourcekod.fr
```

### Application Settings > Allowed Web Origins
```
https://valtheratcg.sourcekod.fr, https://www.valtheratcg.sourcekod.fr
```

---

## 📝 6. Commandes utiles PM2

```bash
# Voir les logs en temps réel
pm2 logs valthera-tcg

# Redémarrer l'application
pm2 restart valthera-tcg

# Arrêter l'application
pm2 stop valthera-tcg

# Supprimer l'application de PM2
pm2 delete valthera-tcg

# Monitoring
pm2 monit

# Voir l'état de toutes les apps
pm2 status
```

---

## 🔄 7. Script de mise à jour

Créer `deploy.sh` à la racine :

```bash
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
```

```bash
chmod +x deploy.sh
```

---

## 🐛 8. Dépannage

### L'application ne démarre pas
```bash
# Vérifier les logs PM2
pm2 logs valthera-tcg --lines 50

# Vérifier que le port n'est pas utilisé
sudo lsof -i :3004
```

### Erreur 502 Bad Gateway
```bash
# Vérifier que PM2 tourne
pm2 status

# Vérifier que le port est bien écouté
curl http://127.0.0.1:3004
```

### Problèmes CORS/Auth0
- Vérifier les URLs dans Auth0 Dashboard
- Vérifier que HTTPS est bien configuré
- Vider le cache du navigateur

---

## 📊 Récapitulatif des ports

| Application | Port |
|-------------|------|
| App 1       | 3000 |
| App 2       | 3001 |
| App 3       | 3002 |
| App 4       | 3003 |
| **Valthera TCG** | **3004** |

---

## ✅ Checklist de déploiement

- [ ] Transférer les fichiers sur le serveur
- [ ] `npm install`
- [ ] `npm run build`
- [ ] Créer `ecosystem.config.cjs`
- [ ] `pm2 start ecosystem.config.cjs`
- [ ] Créer la config NGINX
- [ ] `sudo nginx -t && sudo systemctl reload nginx`
- [ ] `sudo certbot --nginx -d valtheratcg.sourcekod.fr -d www.valtheratcg.sourcekod.fr`
- [ ] Configurer Auth0 avec les URLs de production
- [ ] Exécuter le script SQL `database/add-available-boosters.sql` dans Supabase
- [ ] Tester l'application

---

## 🐳 Déploiement Coolify + Migration hors Supabase

Le guide de migration et de déploiement Docker/Coolify est disponible ici :

- [MIGRATION_SUPABASE_TO_POSTGRESQL.md](MIGRATION_SUPABASE_TO_POSTGRESQL.md)
