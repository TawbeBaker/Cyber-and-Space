#!/bin/bash

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║              📤 Push to GitHub - Cyber-and-Space                     ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# Check if there are commits to push
COMMITS=$(git log origin/main..HEAD --oneline 2>/dev/null | wc -l | xargs)

if [ "$COMMITS" = "0" ]; then
    echo "✅ Already up to date with GitHub"
    exit 0
fi

echo "📊 Commits to push: $COMMITS"
echo ""
git log origin/main..HEAD --oneline
echo ""

# Show tags to push
TAGS=$(git tag --points-at HEAD)
if [ ! -z "$TAGS" ]; then
    echo "🏷️  Tags to push:"
    echo "$TAGS"
    echo ""
fi

# Remote info
echo "🌐 Remote: $(git remote get-url origin)"
echo ""

# Instructions
echo "📝 Pour pusher sur GitHub, exécutez:"
echo ""
echo "   # Option 1: Avec authentification interactive (recommandé)"
echo "   gh auth login"
echo "   gh repo set-default TawbeBaker/Cyber-and-Space"
echo "   git push origin main"
echo "   git push origin --tags"
echo ""
echo "   # Option 2: Avec Personal Access Token"
echo "   export GH_TOKEN=your_github_token"
echo "   git push https://\$GH_TOKEN@github.com/TawbeBaker/Cyber-and-Space.git main"
echo "   git push https://\$GH_TOKEN@github.com/TawbeBaker/Cyber-and-Space.git --tags"
echo ""
echo "   # Option 3: Configurer SSH key (permanent)"
echo "   ssh-keygen -t ed25519 -C 'your_email@example.com'"
echo "   cat ~/.ssh/id_ed25519.pub  # Ajouter à GitHub Settings > SSH Keys"
echo "   git remote set-url origin git@github.com:TawbeBaker/Cyber-and-Space.git"
echo "   git push origin main"
echo "   git push origin --tags"
echo ""

# Summary
echo "📦 Résumé des changements:"
echo ""
git diff --stat origin/main..HEAD 2>/dev/null || echo "   (Exécutez 'git fetch' d'abord pour voir le diff)"
echo ""

echo "✨ Version: 1.4.1"
echo "🌐 Production: https://meteormadness.earth"
echo ""
