# SROI, explained — guide + calculator

A two-page static site that explains how a Social Return on Investment (SROI)
model works, in plain English, and provides a working calculator to build
your own model.

Built around a published New Zealand worked example (the VOYCE – Whakarongo
Mai Social Impact Assessment, Matatihi, 2026) and the methodology framing of
*Integrating Māori Worldviews with Health Economic Evaluation* (Manatū
Hauora, 2025).

## Pages

| File | What it is |
|---|---|
| `index.html` | The explainer — the fence, three core ideas, the eight-step method, the formula |
| `calculator.html` | The tool — full builder: add / rename / delete benefit lines, set parameters and proxies, get a live BCR and NPV. Worked example preloaded. |
| `styles.css` | Shared styles (system fonts, no external dependencies) |
| `calc.js` | Calculator logic (vanilla JS, no dependencies) |

No build step, no frameworks, no external fonts or CDNs. The whole site works
offline from a folder.

## Host it on GitHub Pages

1. Create a new repository (e.g. `sroi-explainer`) and push these files to
   the repository root on the `main` branch.
2. In the repo: **Settings → Pages**.
3. Under **Build and deployment**, set Source to **Deploy from a branch**,
   choose branch **`main`** and folder **`/ (root)`**, then Save.
4. Wait ~1 minute. Your site appears at
   `https://<your-username>.github.io/<repo-name>/`.

That's it — because everything is static and relative-linked, no
configuration is needed.

## The model

For each benefit, for each year *t* = 1, 2, 3:

```
quantity = cohort × (segment % ÷ 100) × (success % ÷ 100) × units per person
value    = quantity × proxy $ per unit
pv       = value ÷ (1 + rate)^(t − 0.5)        # mid-year discounting
```

Then:

```
BCR = Σ pv (all benefits, all years) ÷ programme cost PV
NPV = Σ pv − programme cost PV
```

Conventions to know:

- **Mid-year discounting** (`t − 0.5`) is the convention that reproduces the
  worked example's published figures, consistent with Treasury CBAx practice.
- **Deadweight, attribution and drop-off are embedded in the parameters**,
  not applied as separate multipliers. Segment share counts only people
  exposed above business-as-usual; success rate is net of what would have
  happened anyway; the Year 1→3 taper is the drop-off. Don't apply a second
  round of discount multipliers on top.
- **One-off benefits** (event-based outcomes) get zeros in Years 2–3.
- The calculator computes the **priced stream only**. Outcomes held whole
  (intrinsic / taonga outcomes) are reported as evidenced narrative alongside
  the ratio — never inside it.

## Editing the worked example

The preloaded example lives at the top of `calc.js` in the `EXAMPLE` object.
Each benefit is:

```js
{ name: "…", proxy: 7343, unit: "what one unit means",
  years: [[seg%, succ%, units],   // Year 1
          [seg%, succ%, units],   // Year 2
          [seg%, succ%, units]] } // Year 3
```

Some segment shares are back-solved from the source report's published
population counts (its tables round to whole percent), which is what makes
the preloaded model tie to the published headline (~$21.85m PV, BCR 3.9:1).

## Disclaimer

Educational walkthrough only — not evaluation, financial, or investment
advice. Verify all parameters and proxy values against the current NZ
Treasury CBAx impacts database before using any output in a real business
case. Worked-example figures are the source report's own; interpretations
and reconstructions are this site's.
