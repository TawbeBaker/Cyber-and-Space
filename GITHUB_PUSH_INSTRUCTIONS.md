# 📤 Instructions pour Pusher sur GitHub

## 🎯 Objectif

Synchroniser le code local vers GitHub: `TawbeBaker/Cyber-and-Space`

---

## 📊 État Actuel

**Commits locaux prêts à pusher**: 15+

Derniers commits:
```
3b4d5f5 - cleanup: Remove all obsolete directories and files
e7d0583 - cleanup: Remove redundant documentation files
cdae455 - docs: Consolidate documentation into concise README
aca1b49 - feat: Add meteormadness.earth custom domain support
25947e3 - docs: Add comprehensive release notes for v1.4
```

**Tags à pusher**:
- v1.4.1-production
- v1.4.1-dev
- v1.4-production
- v1.4-dev
- v1.4-orbital-view
- (et autres...)

---

## ✅ Option 1: Avec Personal Access Token (Rapide)

### 1. Créer un Personal Access Token sur GitHub

1. Aller sur https://github.com/settings/tokens
2. Cliquer "Generate new token (classic)"
3. Sélectionner les permissions:
   - ✅ `repo` (accès complet aux repos)
4. Générer et copier le token

### 2. Pusher avec le token

```bash
cd /Users/david/_SpaceChallenge2025

# Remplacer YOUR_TOKEN par votre token GitHub
export GH_TOKEN=YOUR_TOKEN

# Pusher les commits
git push https://$GH_TOKEN@github.com/TawbeBaker/Cyber-and-Space.git main

# Pusher les tags
git push https://$GH_TOKEN@github.com/TawbeBaker/Cyber-and-Space.git --tags
```

---

## ✅ Option 2: Avec GitHub CLI (Recommandé)

### 1. Installer GitHub CLI

```bash
brew install gh
```

### 2. Se connecter à GitHub

```bash
gh auth login
# Suivre les instructions interactives
```

### 3. Pusher

```bash
cd /Users/david/_SpaceChallenge2025

git push origin main
git push origin --tags
```

---

## ✅ Option 3: Avec SSH Key (Permanent)

### 1. Générer une clé SSH (si pas déjà fait)

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# Appuyer sur Entrée pour accepter le chemin par défaut
# Choisir un mot de passe (ou laisser vide)
```

### 2. Ajouter la clé à GitHub

```bash
# Copier la clé publique
cat ~/.ssh/id_ed25519.pub

# Aller sur https://github.com/settings/keys
# Cliquer "New SSH key"
# Coller la clé publique
```

### 3. Configurer le remote SSH

```bash
cd /Users/david/_SpaceChallenge2025

git remote set-url origin git@github.com:TawbeBaker/Cyber-and-Space.git
```

### 4. Pusher

```bash
git push origin main
git push origin --tags
```

---

## 🔍 Vérification

Après le push, vérifier sur GitHub:

**Repo**: https://github.com/TawbeBaker/Cyber-and-Space

Vérifier:
- ✅ Commits présents
- ✅ Tags présents (onglet "Releases")
- ✅ README.md affiché correctement
- ✅ Structure de fichiers propre

---

## 📦 Ce qui sera Pushé

### Structure
```
/
├── README.md                    (documentation complète)
├── asteroid-impact-simulator/   (code principal)
├── docs/                        (config DNS)
├── luis_code_reference/         (référence Luis)
└── terraform/                   (infrastructure)
```

### Fichiers importants
- README.md (documentation principale)
- asteroid-impact-simulator/api/ (backend)
- asteroid-impact-simulator/web/ (frontend)
- docs/DNS_CONFIGURATION_meteormadness.earth.md
- terraform/ (infrastructure Azure)

### Tags
- v1.4.1-production (version actuelle)
- v1.4.1-dev
- Tous les tags précédents

---

## 🚨 Troubleshooting

### Erreur: "Permission denied (publickey)"
→ Utiliser Option 1 (Personal Access Token) ou configurer SSH

### Erreur: "Authentication failed"
→ Vérifier que le token a les bonnes permissions (`repo`)

### Erreur: "Repository not found"
→ Vérifier que le repo existe: https://github.com/TawbeBaker/Cyber-and-Space

### Push prend longtemps
→ Normal, ~10 MB de données à envoyer (dataset asteroids.json)

---

## ✨ Après le Push

Le code sera visible sur:
- **GitHub**: https://github.com/TawbeBaker/Cyber-and-Space
- **Production**: https://meteormadness.earth

Version: 1.4.1
Status: ✅ Ready to push
