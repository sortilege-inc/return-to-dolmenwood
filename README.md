# Return to Dolmenwood

A **West Marches** campaign hub for a *Dolmenwood* (Old-School Essentials) game set in the
Duchy of Brackenwold — the table of **Fitchwick Peckhold** and company.

No build step — hand-authored static HTML, meant for GitHub Pages. Styled after the
[Portents & Fortunes](https://portents.sortilege.online) site but re-themed for Dolmenwood:
a gloomy medieval-fantasy palette drawn from the campaign map (deep forest greens, parchment
cartouche cream, brick-red map-label ink, toadstool purple) and Fitchwick's portrait (earthy
browns, oat-cloth cream, dappled gold), with antique **IM Fell English** display type,
**EB Garamond** body, **Cinzel** chrome, and a **UnifrakturMaguntia** blackletter accent.

## Structure

| Path | What it is |
|------|------------|
| `index.html` | Home — masthead, the three table links, the map hero, section grid |
| `character/` | Fitchwick Peckhold's dossier — scores, saves, skills, runes, gear |
| `atlas/` | The Dolmenwood map + a gazetteer of its settlements, keeps, and wilds |
| `rules/` | The Dolmenwood rules reference, house rules, and how to join |
| `chronicle/` | Expedition record (scaffolded — play has not begun) |
| `dolmenwood.css` | The whole theme |
| `assets/` | Optimized map + portrait + token (webp), favicon |

## The three table links (prominent on Home and Rules)

- **Foundry:** <https://foundry.heltonfamily.info/join>
- **West Marches community:** <https://www.westmarches.games/communities/return-to-dolmenwood>
- **House rules:** <https://www.hilltown.studio/gdw/index.html#house-rules>

## Rules reference

<https://www.dolmenwood.necroticgnome.com/rules/doku.php?id=start>

## Notes

- `ingest/` is git-ignored (source map, portrait, token, Foundry actor JSON).
- Character stats come from the Foundry VTT actor export. Fitchwick is a **Human Enchanter,
  level 2, chaotic** — the actor's stale `class: "fighter"` field is overridden by the
  Enchanter *class item* and matching XP threshold (1,750). The **Deathly Blossom** rune text
  is reproduced verbatim from Dolmenwood.
- Gazetteer blurbs are sketched from the map; deep site lore is left to the Loremaster.
