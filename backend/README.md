# Hotel Bregu — paketa e plotë

## Struktura

```
backend/
  server.js        → API + Socket.io + kufizim kërkesash + statistika + CSV export + skeduesi i ndjekjes
  models.js         → skemat MongoDB (mesazhe, kërkesa, porosi, vlerësime, përmbajtje, rekomandime)
  seed.js           → mbush përmbajtjen fillestare shembull (run once: node seed.js)
  .env              → MONGODB_URI, ADMIN_PASSWORD, STAFF_PASSWORD, FOLLOWUP_HOURS
hotel-bregu-guest-app.html → app-i i mysafirit (chat, kërkesa, room-service, hartë reale, mot i drejtpërdrejtë, PWA)
staff-dashboard.html      → paneli i stafit (login, statistika, tinguj, CSV export, status porosie)
admin.html                → paneli admin (edito wifi, pajisje, rekomandime me foto/koordinata)
index.html                 → faqja hyrëse me tre butona
manifest.json / service-worker.js / icon-*.png → e bëjnë app-in "të instalueshëm" në telefon (PWA)
```

## Fjalëkalimet (te backend/.env)

- `ADMIN_PASSWORD` — për panelin admin (redakton përmbajtjen)
- `STAFF_PASSWORD` — për panelin e stafit (sheh mesazhe/porosi/kërkesa)
- Admin-i mund të përdorë edhe fjalëkalimin e stafit si "master" — janë të ndara që të mund t'ia japësh stafit pa i dhënë akses admin

**Ndrysho këto fjalëkalime** te `.env` përpara se ta vendosësh live, dhe rifresko variablat përkatëse te Render (Environment tab).

## Çfarë është shtuar në këtë version

- **Siguri:** paneli i stafit dhe admin tani kërkojnë fjalëkalim; kufizim kërkesash (20/min/IP) mbron nga spam-i në chat/porosi
- **Hartë reale:** OpenStreetMap (falas, pa çelës API) me pin për hotelin dhe çdo rekomandim, koordinata reale të editueshme nga admin
- **Përmbajtje e editueshme:** wifi, pajisjet, "ku ndodhet", menuja e room-service, dhe rekomandimet (me foto opsionale) — të gjitha nga `admin.html`, shumë-gjuhëshe (SQ/EN/IT/DE)
- **Mot i drejtpërdrejtë:** Open-Meteo (falas, pa çelës), bazuar te koordinatat e hotelit
- **Statusi i porosisë i dukshëm te mysafiri:** kur stafi shënon "po përgatitet" ose "u dorëzua", mysafiri merr njoftim automatik
- **Ndjekje pas porosisë:** çdo `FOLLOWUP_HOURS` orë (parazgjedhje 2), nëse porosia është dorëzuar dhe s'është "ndjekur", dërgohet automatikisht një mesazh "shpresojmë t'ju ketë pëlqyer"
- **Statistika për stafin:** kërkesa/porosi sot, vlerësim mesatar, ora më e ngarkuar
- **Tinguj njoftimi:** "bip" automatik te paneli i stafit kur vjen mesazh/kërkesë/porosi e re (buton ON/OFF lart djathtas)
- **Eksport CSV:** butonat "Eksporto CSV" te vlerësimet dhe porositë, për arkiva
- **PWA:** mund të "Shtohet në ekranin bazë" nga telefoni si app i vërtetë (Chrome/Safari → "Add to Home Screen")

## Hapat për ta vendosur këtë version

1. Shpaketo mbi dosjen ekzistuese lokale (zëvendëso skedarët)
2. Kontrollo `.env` — janë shtuar `STAFF_PASSWORD` dhe `FOLLOWUP_HOURS`, ndryshoji nëse do
3. Lokalisht: `cd backend && npm install && npm start` (do të shkarkojë `express-rate-limit` të ri)
4. **Ekzekuto once (nëse nuk e ke bërë ende):** `node seed.js` — mbush përmbajtjen fillestare
5. Push në GitHub (`git add .`, `git commit`, `git push`) — Render e rideployon vetë
6. **Te Render → Environment**, shto edhe `STAFF_PASSWORD` dhe `FOLLOWUP_HOURS` si variabla (të njëjtat vlera si te `.env` lokal)
7. Hap `admin.html`, vendos fjalëkalimin admin, dhe fillo të ndryshosh koordinatat reale të hotelit + rekomandimet

## Kufizime për t'i ditur

- **Ndjekja pas porosisë** funksionon vetëm kur backend-i është aktiv — plani falas i Render e fik serverin pas ~15 min pa trafik, kështu që nëse askush s'e "zgjon" me një kërkesë, kontrolli 5-minutësh nuk ekzekutohet derisa dikush të vizitojë sërish app-in. Për prodhim serioz, plani i paguar i Render (që s'fiket) e zgjidh këtë plotësisht.
- **Fjalëkalimet e stafit/admin janë të thjeshta** (një fjalëkalim i përbashkët, jo llogari individuale) — të mjaftueshme për një hotel të vogël, por jo nivel "enterprise".
- **Mbështetja shumë-hotele** ende s'është ndërtuar — ky sistem është i projektuar për një hotel të vetëm. Nëse do të përdoret për disa hotele, duhet një ridizajnim i bazës së të dhënash (çdo koleksion do të duhej "hotel_id"), më thuaj nëse ta trajtojmë si projekt të veçantë.
