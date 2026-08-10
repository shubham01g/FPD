# Landing page media slots

Drop real `.mp4` (H.264, muted, loop-friendly) or poster `.jpg` files here and they
appear automatically — the landing page references these exact paths. Until a file
exists, a branded Royal-Vault-Blue gradient placeholder shows in its place, so the
layout looks intentional with or without assets.

| Slot file              | Where it appears                          | Suggested content                                  |
|------------------------|-------------------------------------------|----------------------------------------------------|
| `hero.mp4`             | Full-bleed hero background                | Warm multi-generation family at home               |
| `hero.jpg`             | Hero poster (first frame / fallback)      | Still frame of the hero clip                        |
| `story-vault.mp4`      | "A vault that outlives you" split         | Documents / secure vault / organizing papers        |
| `story-contacts.mp4`   | "The right people, at the right time"     | Handing keys / trusted person / signing             |
| `story-memories.mp4`   | "Memories that speak for you" split       | Recording a video message / looking at photos       |
| `story-family.mp4`     | "The words they'll need to hear" split    | A loved one comforted at a difficult moment           |
| `story-pets.mp4`       | "For the ones who rely on you most" split | Kids and pets — family playing together at home      |
| `cta.mp4`              | Closing CTA band background               | Abstract royal-blue light particles / calm aura      |
| `about-bg.jpg`         | About page banner                         | Earthrise — big-picture, "why we exist" tone         |
| `how-it-works-bg.jpg`  | How It Works page banner                  | Waterfall / mountain — a journey, step by step        |
| `features-bg.jpg`      | Features page banner                      | Forest — depth and abundance                          |
| `security-bg.jpg`      | Security page banner                      | Dark tech/desk setup — digital, controlled            |
| `partners-bg.jpg`      | Partners page banner                      | Handshake — business partnership                      |
| `white-glove-bg.jpg`   | White Glove Concierge page banner         | Night sky — premium, serene, personal care             |
| `help-bg.jpg`          | Help / Contact Us page banner             | Support team with headsets — real people, ready to help |
| `pricing-bg.jpg`       | Pricing page banner                       | Zen garden path — calm, deliberate value                |
| `affiliates-bg.jpg`    | Affiliates page banner                    | Group of kids/friends — sharing, community              |
| `white-label-bg.jpg`   | White Label page banner                   | Branded house rendering — your own platform, your brand |

Poster convention: for any `foo.mp4`, add `foo.jpg` as its poster frame. The landing
page auto-derives the poster path from the video (`foo.mp4` → `foo.jpg`), so you don't
pass it in code — just drop both files here.

## Performance / instant load
- Videos should be **web-optimized H.264** with `-movflags +faststart` (moov atom at
  the front) so they stream progressively instead of downloading fully first.
- Only the **hero** loads eagerly; every other video is **lazy-loaded** (its poster
  paints instantly and the video mounts only when scrolled near). Keep posters small.
- Re-compress any new drop-in with the repo's `ffmpeg-static` binary. Rough targets:
  hero ~1080p CRF 30, story clips 720p CRF 31, CTA CRF 31 — a few hundred KB to ~2 MB
  each. Keep the whole `public/media/` folder well under ~5 MB total.
