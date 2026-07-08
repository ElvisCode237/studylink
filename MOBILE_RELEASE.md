# StudyLink Mobile Release

StudyLink est prepare avec Capacitor pour generer une application Android et iOS a partir du frontend React/Vite.

## Important avant publication

- Le backend doit etre deploye en HTTPS public avant une vraie publication Play Store/App Store.
- L'app mobile ne peut pas utiliser `http://localhost:4000/api` sur le telephone d'un utilisateur.
- Mettez `VITE_API_URL=https://votre-backend.example.com/api` dans `frontend/.env.production` avant `npm run mobile:build`.
- iOS doit etre compile sur macOS avec Xcode et un compte Apple Developer.
- Android doit etre signe avec une cle de release avant l'envoi sur Google Play Console.

## Commandes

Depuis `frontend` :

```bash
npm install
npm run mobile:build
```

Android :

```bash
npm run mobile:android
```

Dans Android Studio, genere ensuite un Android App Bundle :

```text
Build > Generate Signed Bundle / APK > Android App Bundle
```

iOS :

```bash
npm run mobile:ios
```

Dans Xcode, configure l'equipe Apple, le Bundle Identifier `com.studylink.mobile`, puis archive :

```text
Product > Archive > Distribute App
```

## Donnees locales de demonstration

La base locale Docker et les donnees de demo servent au developpement. Pour les stores, deploie le backend Node/Express avec PostgreSQL/Supabase, puis reconstruis l'app avec l'URL API publique.
