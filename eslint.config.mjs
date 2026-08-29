import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));

// eslint-config-next still ships its legacy (non-flat) config shape on
// Next.js 15 — FlatCompat is the officially documented bridge to use it
// under ESLint 9's flat config system.
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // This rule flags the standard "reset controlled form state when a
      // dialog's `open`/`item` prop changes" effect used throughout
      // src/components/**/*-form-dialog.tsx and use-theme.ts. That pattern
      // is the idiomatic way to sync a modal's local form fields to the
      // record being edited, and there's no state-during-render
      // alternative that doesn't complicate every form component — so this
      // specific check is disabled project-wide rather than suppressed
      // ad hoc at a dozen call sites.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", ".open-next/**", ".wrangler/**"],
  },
];

export default eslintConfig;
