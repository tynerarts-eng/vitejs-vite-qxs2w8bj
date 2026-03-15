# Removed Code Notes

This file preserves the intent behind code that was removed while normalizing the repository into a locally hostable vanilla Vite baseline.

## 1. Invalid `index.html` React/MUI component

Before cleanup, `index.html` did not contain a normal Vite HTML document. Instead, it contained React component source that appeared to be copied from a Material UI page component.

### What it was trying to do

It looked like an early portfolio-style homepage concept with:

- A hero section using a background image at `/images/hero.jpg`
- Headline copy for a visual artist
- Primary buttons for `View Gallery` and `About`
- A `Featured Works` grid using four image cards
- An artist bio section with avatar, short bio, and email subscription CTA
- A footer with email/contact actions

### Technical issues in the removed version

- It was JSX/React code placed directly in `index.html`, so Vite could not use it as the app entrypoint.
- The repo did not include `react`, `react-dom`, `@mui/material`, or `@mui/icons-material`.
- The referenced assets under `/images/...` were not present in the repo.
- Some text encoding was corrupted in the copied content.

### If we want to reintroduce this idea later

We should make explicit decisions on:

- Whether the site should stay vanilla JS or be migrated to React
- Whether Material UI is actually desired, or whether custom CSS is better for the site
- Whether this should remain an artist portfolio concept or be adapted to the real site subject
- What the real image/content sources will be

## 2. Default Vite starter app in `src/`

The previous `src/main.js`, `src/style.css`, and `src/counter.js` were the standard Vite starter/demo.

### What it was trying to do

It was only demonstrating:

- Basic Vite asset loading
- Hot module replacement
- A click counter interaction
- Links to Vite and JavaScript documentation/community pages

### Why it was removed

- It was placeholder demo code, not site functionality
- It distracted from building a real local-development baseline
- The counter module had no value for the actual site direction

## Suggested follow-up planning topics

If we want a new implementation plan that restores any removed intent, the most useful planning tracks are:

1. Decide the actual site type:
   artist portfolio, family/personal site, archive, or something else.
2. Decide the tech level:
   stay vanilla Vite, or intentionally migrate to React.
3. Decide the first real content model:
   hero, about, gallery, timeline, contact, newsletter, etc.
4. Decide what external dependencies are worth adding:
   UI library, routing, CMS integration, form backend, image pipeline.

## Current baseline

The repo now runs as a plain Vite site with a single-page placeholder shell intended to support local testing and future structured iteration.
