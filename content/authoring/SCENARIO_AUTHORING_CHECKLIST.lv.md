# Scenāriju izstrādes kontrolsaraksts

Izmanto šo kontrolsarakstu pirms scenāriju pievienošanas vai izmaiņām. Tas ir ātrākais veids, kā izvairīties no regresijām un tulkojumu iztrūkumiem.

## 1) Obligātā struktūra
- [ ] `startSceneId` pastāv `scenes` sarakstā.
- [ ] Katrs `scene.id` ir unikāls.
- [ ] Katrs `scene.nextSceneId` norāda uz esošu ainu.
- [ ] Katrs `choice.nextSceneId` norāda uz esošu ainu.

## 2) Tīkli (network_selection ainas)
- [ ] Katram tīklam ir derīgs izvēles ceļš.
  - Ieteicams: iestati `network.actionId` un pievieno `choice` ar to pašu `actionId`.
  - Saderībai ar iepriekšējo: ja `network.actionId` nav norādīts, dzinējs izmanto `connect_<network.id>`.
- [ ] Ja tīkls ir mobilie dati, iestati `network.isMobileData: true`.
- [ ] Vienā ainā nav dublētu tīklu ID vai dublētu `choice.actionId`.

## 3) Darbības un izvēles
- [ ] Katrs `choice.actionId` ir unikāls vienā ainā.
- [ ] Darbību ID ir unikāli vienā ainā.
- [ ] Izvēles atsaucas uz:
  - darbību no `scene.actions`, vai
  - tīkla darbību (explicit `network.actionId` vai `connect_<network.id>`).

## 4) Uzdevumi un jutīgums
- [ ] `task_prompt` ainas ietver `task` ar `sensitivityLevel` (`low`, `medium`, `high`, vai `critical`).
- [ ] **Critical** uzdevumiem vienkāršs `proceed` ir pareizs tikai ar VPN vai mobilajiem datiem.
  - Ja atļauj `proceed` kritiskam uzdevumam bez aizsardzības, pievieno sekas, kas atspoguļo lielāku risku.

## 5) Sekas un punktu skaits
- [ ] Katrai sekai ir skaidrs drošības/riska rezultāts un reālistisks skaidrojums.
- [ ] `safetyPointsChange` un `riskPointsChange` atbilst smagumam.
- [ ] Izvairies no absolūtiem apgalvojumiem; izmanto riska samazinājuma valodu (piem., “ievērojami grūtāk”, nevis “neiespējami”).

## 6) Tulkošanas prasības (EN + LV + RU)
Jebkurš lietotājam redzams teksts jāiztulko pilnībā.
- [ ] Jauns teksts izmanto `...Key` laukus un ir pievienots:
  - `client/src/locales/en.json`
  - `client/src/locales/lv.json`
  - `client/src/locales/ru.json`
- [ ] Ja pievieno jaunu `titleKey`, `descriptionKey`, `labelKey` u.c., pārliecinies, ka tas ir visās valodās.

## 7) Validācijas komandas
Palaid šīs komandas pirms commit:
- [ ] `npm run validate:scenarios`
- [ ] `node scripts/i18n-validate.js`
- [ ] `npm run authoring:check` (palīg‑ieteikumi)

## 8) Biežākās kļūdas, no kurām izvairīties
- [ ] Tīkls eksistē, bet nav atbilstošas izvēles.
- [ ] Kļūdas `nextSceneId` vai `actionId`.
- [ ] Dublēti darbību ID vienā ainā.
- [ ] Jauns teksts pievienots tikai angļu valodā (trūkst LV/RU).
- [ ] Riska valoda, kas sola noteiktību, nevis samazinājumu.
