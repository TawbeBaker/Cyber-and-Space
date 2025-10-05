# 🌐 Configuration DNS pour meteormadness.earth

## ✅ Domaine Personnalisé Configuré

Azure Static Web Apps est maintenant prêt à accepter le trafic depuis **meteormadness.earth**

---

## 📋 Enregistrements DNS à Ajouter

Vous devez ajouter ces enregistrements DNS chez votre registrar de domaine (ex: GoDaddy, Namecheap, Cloudflare, etc.):

### 1️⃣ Enregistrement TXT (Validation)

**IMPORTANT**: Ajoutez cet enregistrement EN PREMIER pour valider la propriété du domaine.

```
Type:     TXT
Name:     @  (ou meteormadness.earth)
Value:    _rgymmm7lzi4dya0gffknse35dsogel6
TTL:      3600 (ou Auto)
```

### 2️⃣ Enregistrement ALIAS/ANAME (Domaine Apex)

**Après validation TXT**, ajoutez l'enregistrement ALIAS pour pointer vers Azure:

```
Type:     ALIAS (ou ANAME)
Name:     @  (ou meteormadness.earth)
Target:   kind-plant-00c23d60f.1.azurestaticapps.net
TTL:      3600 (ou Auto)
```

**Note**: Si votre registrar ne supporte pas ALIAS/ANAME, utilisez un enregistrement A avec l'IP d'Azure Static Web Apps (voir section "Alternative" ci-dessous).

### 3️⃣ Enregistrement CNAME pour www (OPTIONNEL)

Si vous voulez aussi **www.meteormadness.earth**:

```
Type:     CNAME
Name:     www
Target:   kind-plant-00c23d60f.1.azurestaticapps.net
TTL:      3600 (ou Auto)
```

---

## 🔧 Instructions par Registrar

### Cloudflare
1. Allez dans **DNS** → **Records**
2. Ajoutez TXT record:
   - Type: `TXT`
   - Name: `@`
   - Content: `_rgymmm7lzi4dya0gffknse35dsogel6`
3. Ajoutez CNAME record (Cloudflare permet CNAME sur apex avec flattening):
   - Type: `CNAME`
   - Name: `@`
   - Target: `kind-plant-00c23d60f.1.azurestaticapps.net`
   - Proxy status: ⚠️ **DNS Only** (orange cloud OFF)

### GoDaddy
1. Allez dans **DNS Management**
2. Add Record → TXT:
   - Name: `@`
   - Value: `_rgymmm7lzi4dya0gffknse35dsogel6`
3. Add Record → CNAME (GoDaddy permet CNAME forwarding):
   - Type: `CNAME`
   - Name: `@`
   - Points to: `kind-plant-00c23d60f.1.azurestaticapps.net`

### Namecheap
1. Advanced DNS → Add New Record
2. TXT Record:
   - Host: `@`
   - Value: `_rgymmm7lzi4dya0gffknse35dsogel6`
3. ALIAS Record:
   - Type: `ALIAS`
   - Host: `@`
   - Value: `kind-plant-00c23d60f.1.azurestaticapps.net`

### Route 53 (AWS)
1. Create Record → Simple routing
2. TXT:
   - Record name: (leave blank)
   - Value: `_rgymmm7lzi4dya0gffknse35dsogel6`
3. ALIAS:
   - Record type: `A`
   - Alias: `No`
   - Value: (Get IP from Azure - see Alternative section)

---

## 🔄 Alternative: Enregistrement A (Si ALIAS non supporté)

Si votre registrar ne supporte pas ALIAS/ANAME pour les domaines apex, vous devez utiliser un enregistrement A avec l'adresse IP d'Azure Static Web Apps.

**⚠️ PROBLÈME**: Azure Static Web Apps utilise des IPs dynamiques. La meilleure solution est de:
1. Utiliser un service CDN (Cloudflare) qui supporte CNAME flattening
2. Ou utiliser uniquement `www.meteormadness.earth` avec un redirect HTTP depuis l'apex

---

## ✅ Vérification de la Configuration

### 1. Vérifier TXT Record
```bash
# Attendez 5-10 minutes après avoir ajouté le TXT
dig TXT meteormadness.earth +short
# Doit afficher: "_rgymmm7lzi4dya0gffknse35dsogel6"
```

### 2. Vérifier ALIAS/CNAME
```bash
# Attendez 5-30 minutes après avoir ajouté l'ALIAS/CNAME
dig meteormadness.earth +short
# Doit résoudre vers l'IP d'Azure Static Web Apps
```

### 3. Tester HTTPS
```bash
curl -I https://meteormadness.earth
# Doit retourner HTTP/2 200 après validation complète
```

---

## 🕐 Délais de Propagation

| Étape | Temps Estimé |
|-------|-------------|
| Ajout TXT record | 5-10 minutes |
| Validation Azure | 1-5 minutes après TXT propagation |
| Ajout ALIAS/CNAME | 5-30 minutes |
| Propagation DNS globale | 24-48 heures (max) |
| Certificat SSL Azure | 5-10 minutes après validation |

**Généralement opérationnel en**: 30-60 minutes

---

## 🔐 Certificat SSL/TLS

Azure Static Web Apps génère **automatiquement** un certificat SSL gratuit (Let's Encrypt) après validation du domaine. Aucune action requise!

**Status SSL**: Vérifie sur https://meteormadness.earth après validation

---

## 📊 État Actuel

```
Domaine configuré:     meteormadness.earth
Token validation TXT:  _rgymmm7lzi4dya0gffknse35dsogel6
Target ALIAS/CNAME:    kind-plant-00c23d60f.1.azurestaticapps.net
Status Azure:          ✅ En attente de validation DNS
SSL Auto:              ✅ Oui (après validation)
```

---

## 🚀 Prochaines Étapes

1. **MAINTENANT**: Allez chez votre registrar de domaine (ex: Cloudflare, GoDaddy)
2. **Ajoutez l'enregistrement TXT** avec le token de validation
3. **Attendez 10 minutes** que le TXT se propage
4. **Ajoutez l'enregistrement ALIAS/CNAME** pointant vers Azure
5. **Attendez 30-60 minutes** pour la propagation complète
6. **Testez**: Ouvrez https://meteormadness.earth dans votre navigateur

---

## 🔍 Dépannage

### Erreur: "DNS validation failed"
- Vérifiez que le TXT record est correct
- Attendez 15-20 minutes supplémentaires
- Utilisez `dig TXT meteormadness.earth` pour vérifier

### Erreur: "Site not found" ou "404"
- Vérifiez que l'ALIAS/CNAME pointe vers le bon hostname
- Attendez la propagation DNS (jusqu'à 24h)
- Vérifiez avec `dig meteormadness.earth`

### Certificat SSL invalide
- Azure génère le certificat automatiquement après validation
- Attendez 5-10 minutes après validation DNS
- Essayez en mode incognito pour éviter le cache

### Redirect vers kind-plant-00c23d60f.1.azurestaticapps.net
- C'est normal pendant la première heure
- Azure finalise la configuration du domaine
- Patience! Le domaine personnalisé sera actif sous peu

---

## 📞 Support

Si vous rencontrez des problèmes après 24h:

```bash
# Vérifier le status du domaine sur Azure
az staticwebapp hostname show \
  -n swa-asteroid-impact-92nppgw4 \
  -g rg-asteroid-impact-92nppgw4 \
  --hostname meteormadness.earth

# Vérifier les logs
az monitor activity-log list \
  --resource-group rg-asteroid-impact-92nppgw4 \
  --max-events 20
```

---

## 📝 Notes Importantes

⚠️ **Ne supprimez JAMAIS le TXT record** après validation! Certains systèmes le vérifient périodiquement.

✅ **CORS déjà configuré**: Le backend API accepte déjà les requêtes du nouveau domaine (CORS: *)

🔄 **Mise à jour future**: Aucune action requise pour les déploiements futurs. Le domaine reste actif.

---

**Date de configuration**: 5 octobre 2025
**Configuré par**: Claude Code
**Status**: ⏳ En attente de configuration DNS chez le registrar

---

🎉 **Une fois configuré, votre site sera accessible sur**:
- https://meteormadness.earth ✨
- https://kind-plant-00c23d60f.1.azurestaticapps.net (URL originale reste active)
