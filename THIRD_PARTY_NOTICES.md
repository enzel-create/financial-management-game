# Third-party notices

The application uses packages installed through the pinned pnpm lockfile. The browser artwork consists of CSS, included SVG starter icons and package-provided icons. No course slide deck or external stock photo is distributed.

Retained vendored notices:

- `build/sites-vite-plugin.LICENSE`: MIT, Copyright 2026 OpenAI; covers the included Sites build integration.
- `vendor/shadcn-tailwind-4.13.0.LICENSE.md`: MIT, Copyright 2023 shadcn; accompanies the vendored stylesheet.

React, Next.js/Vinext, Vite, Tailwind, Lucide and other packages retain their own package licenses and notices. Installed dependencies are not copied into this source release. Run `pnpm install --frozen-lockfile` to restore them. The source archive excludes node_modules, build output, credentials and room state.
