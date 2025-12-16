# Translation Glossary

This glossary defines key terms for consistent translation across English, Latvian, and Russian.

## Technical Terms (Do NOT Translate)

These terms should remain in English across all languages:

| Term | Reason |
|------|--------|
| Wi-Fi | International standard term |
| VPN | Technical acronym |
| SSID | Technical acronym (network name) |
| WPA/WPA2/WPA3 | Security protocol names |
| HTTPS | Protocol name |
| URL | Technical acronym |
| DNS | Technical acronym |
| IP | Technical acronym |

## UI Elements

| English | Latvian | Russian | Context |
|---------|---------|---------|---------|
| Continue | Turpināt | Продолжить | Button to proceed |
| Back | Atpakaļ | Назад | Navigation button |
| Start | Sākt | Начать | Begin action |
| Exit | Iziet | Выход | Leave current view |
| Score | Rezultāts | Счёт | Game points |
| Badge | Nozīmīte | Значок | Achievement icon |
| Network | Tīkls | Сеть | Wi-Fi network |
| Connect | Pieslēgties | Подключиться | Join network |
| Disconnect | Atvienoties | Отключиться | Leave network |
| Settings | Iestatījumi | Настройки | Configuration |

## Game-Specific Terms

| English | Latvian | Russian | Context |
|---------|---------|---------|---------|
| Scenario | Scenārijs | Сценарий | Game level/situation |
| Difficulty | Grūtības pakāpe | Сложность | Game difficulty level |
| Beginner | Iesācējs | Начинающий | Easy difficulty |
| Intermediate | Vidējais | Средний | Medium difficulty |
| Advanced | Pieredzējis | Продвинутый | Hard difficulty |
| Risk | Risks | Риск | Security risk |
| Safe | Drošs | Безопасно | Secure option |
| Suspicious | Aizdomīgs | Подозрительный | Potentially dangerous |
| Consequence | Sekas | Последствие | Result of action |

## Security Terms

| English | Latvian | Russian | Context |
|---------|---------|---------|---------|
| Secure | Drošs | Защищённый | Protected/encrypted |
| Unsecured | Neaizsargāts | Незащищённый | Not protected |
| Encrypted | Šifrēts | Зашифрованный | Data protection |
| Public network | Publiskais tīkls | Публичная сеть | Open Wi-Fi |
| Credential | Akreditācijas dati | Учётные данные | Login info |
| Phishing | Pikšķerēšana | Фишинг | Scam attempt |
| Malware | Ļaunatūra | Вредоносное ПО | Malicious software |

## Locations

| English | Latvian | Russian | Context |
|---------|---------|---------|---------|
| Coffee Shop | Kafejnīca | Кофейня | Game location |
| Hotel | Viesnīca | Отель | Game location |
| Airport | Lidosta | Аэропорт | Game location |
| Library | Bibliotēka | Библиотека | Game location |

## ICU Plural Rules

### Russian Plural Categories
Russian requires four plural forms:
- **one**: 1, 21, 31, 41... (ends in 1, except 11)
- **few**: 2-4, 22-24, 32-34... (ends in 2-4, except 12-14)
- **many**: 0, 5-20, 25-30... (ends in 0, 5-9, or 11-14)
- **other**: fractions, decimals

Example:
```
{count, plural,
  one {# сценарий}
  few {# сценария}
  many {# сценариев}
  other {# сценариев}
}
```

### Latvian Plural Categories
Latvian uses simpler pluralization:
- **one**: 1, 21, 31... (ends in 1, except 11)
- **other**: everything else

Example:
```
{count, plural,
  one {# scenārijs}
  other {# scenāriji}
}
```

## Translation Quality Guidelines

1. **Consistency**: Use terms from this glossary consistently
2. **Context**: Consider where text appears (button, heading, body text)
3. **Length**: Allow for 30-40% text expansion in translations
4. **Formality**: Use formal "you" (Jūs/Вы) for user-facing text
5. **Technical accuracy**: Preserve meaning of security concepts
