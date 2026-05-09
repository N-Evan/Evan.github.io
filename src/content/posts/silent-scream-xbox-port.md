---
title: "Porting Silent Scream to XBox: Game Feel Notes"
summary: "What changed when we moved a horror cooking game from PC to console — and why controller feel needs to be designed, not ported."
date: 2026-04-22
tags: [post-mortem, silent-scream, console]
---

When we ported Silent Scream to XBox, my main job was making sure the game
*felt* right on a controller. Below are the rules I ended up writing for
myself by the end of it.

## Aim assist isn't cheating

The PC build relied on precise mouse aiming for several mechanics. On a
controller, raw stick input over those same UI targets felt punishing —
not "horror tense," just *unfair*. We added soft snapping at very short
ranges, with the assist disabled during high-stakes scenes so it never
robbed the player of a deliberate miss.

## Vibration is a dialogue

Default rumble is a wall of noise. We split haptics into three layers:

- **Ambient** — low-frequency hum tied to dread state, very subtle.
- **Reactive** — short pulses on impact, tied to physics events.
- **Cinematic** — long ramps reserved for scripted moments.

Layering them means each pulse means something. A cinematic ramp during a
quiet kitchen scene now reads like a warning, not background noise.

## Frame pacing is a feature

[ FILL ME IN: include the GIF showing pre/post pacing comparison once
captured ]

## Closing thoughts

Console ports aren't translations; they're new designs that share assets
with the original. The shipped XBox build ended up *feeling* better than
the PC original in a few spots — not because PC was bad, but because
constraint-driven design forces you to defend every input decision.
