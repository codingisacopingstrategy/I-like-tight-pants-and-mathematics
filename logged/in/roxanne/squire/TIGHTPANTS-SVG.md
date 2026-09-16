Search `TIGHTPANTS-SVG` in `squire-raw.js` after a Squire upgrade.

Two sites, both `instanceof SVGElement`:

1. `getNodeCategory` — treat SVG as inline so `fixContainer` does not walk `<path>`.
2. `cleanTree` — skip the “not an HTMLElement → remove” branch.
