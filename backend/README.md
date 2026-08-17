# Hotel Bregu — backend (MongoDB) + panel stafi

Backend real (API + chat në kohë reale) i lidhur me **MongoDB Atlas**, plus
paneli ku stafi sheh dhe përgjigjet.

## Struktura

```
backend/
  server.js        → API + Socket.io (chat në kohë reale)
  models.js         → skemat e Mongoose (mesazhe, kërkesa, porosi, vlerësime)
  .env              → connection string-i yt i MongoDB (MOS e ndaj/publiko)
  .env.example       → shembull pa të dhëna sensitive
  package.json
staff-dashboard.html      → paneli i stafit
hotel-bregu-guest-app.html → app-i i mysafirit
```

## Si ta ndezësh lokalisht

```powershell
cd backend
npm install
npm start
```

Duhet të shohësh:
```
Connected to MongoDB
Hotel Bregu backend running on port 3001
```

Provo në browser: `http://localhost:3001/api/health` → duhet `{"ok":true,"db":"connected"}`

Pastaj hap `staff-dashboard.html`, lëre `http://localhost:3001` në fushën lart
dhe kliko "Lidhu".

**Nëse `.env` mungon ose nuk lidhet:** kopjo `.env.example` si `.env` dhe
ngjit connection string-in tënd nga Atlas (butoni "Connect" → "Drivers"),
duke zëvendësuar `<username>`, `<password>`, `<cluster-host>`.

## E rëndësishme — siguria e fjalëkalimit

Fjalëkalimi i bazës së të dhënave ndodhet në `.env`. **Mos e ngarko këtë
skedar në GitHub apo diku publik** — `.gitignore` e përjashton automatikisht
nëse përdor git. Meqë ky fjalëkalim është ndarë tashmë në bisedë, është ide e
mirë ta ndryshosh te Atlas (Database Access → Edit User → Edit Password) sapo
të kesh gjithçka duke punuar.

## Si të lidhet app-i i mysafirit me backend-in

App-i aktual (`hotel-bregu-guest-app.html`) ende përdor chat të simuluar. Kur
ta kesh backend-in duke punuar (lokalisht ose online), më jep URL-në dhe e
lidh direkt.

## Si ta vendosësh (deploy) në internet

- **Backend:** [Railway](https://railway.app) ose [Render](https://render.com)
  — ngarko dosjen `backend/`, shto `MONGODB_URI` si "environment variable" në
  panelin e tyre (jo si skedar `.env` të ngarkuar).
- **App-i i mysafirit + paneli i stafit:** [Netlify](https://netlify.com) ose
  [Vercel](https://vercel.com), falas.
- Në Atlas, nën "Network Access", shto `0.0.0.0/0` (lejo nga kudo) që
  Railway/Render të mund të lidhen — ose adresat IP specifike të tyre nëse do
  më shumë siguri.

## Çfarë mungon ende për prodhim real

- Autentikim për panelin e stafit
- Njoftime push
- HTTPS (automatik nga Railway/Render/Netlify/Vercel)
