#!/bin/bash

echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║              📤 Push to GitHub - Interactive                         ║"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# Ask for GitHub token
echo "🔑 GitHub Personal Access Token requis"
echo ""
echo "   1. Aller sur: https://github.com/settings/tokens"
echo "   2. Cliquer 'Generate new token (classic)'"
echo "   3. Sélectionner: ✅ repo"
echo "   4. Copier le token"
echo ""
read -p "Collez votre token GitHub (ou Ctrl+C pour annuler): " GH_TOKEN
echo ""

if [ -z "$GH_TOKEN" ]; then
    echo "❌ Token vide, annulation"
    exit 1
fi

echo "📤 Push des commits..."
git push https://$GH_TOKEN@github.com/TawbeBaker/Cyber-and-Space.git main

if [ $? -eq 0 ]; then
    echo "✅ Commits pushés avec succès!"
    echo ""
    echo "📤 Push des tags..."
    git push https://$GH_TOKEN@github.com/TawbeBaker/Cyber-and-Space.git --tags

    if [ $? -eq 0 ]; then
        echo "✅ Tags pushés avec succès!"
        echo ""
        echo "🎉 Push complet!"
        echo ""
        echo "Vérifier sur: https://github.com/TawbeBaker/Cyber-and-Space"
    else
        echo "❌ Erreur lors du push des tags"
    fi
else
    echo "❌ Erreur lors du push des commits"
    echo ""
    echo "Vérifier:"
    echo "  - Token valide?"
    echo "  - Permission 'repo' activée?"
    echo "  - Repository existe?"
fi
