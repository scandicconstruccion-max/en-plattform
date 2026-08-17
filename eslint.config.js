import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";

export default [
  {
    files: [
      "src/components/**/*.{js,mjs,cjs,jsx}",
      "src/pages/**/*.{js,mjs,cjs,jsx}",
      "src/Layout.jsx",
    ],
    ignores: ["src/lib/**/*", "src/components/ui/**/*"],
    ...pluginJs.configs.recommended,
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "unused-imports": pluginUnusedImports,
    },
    rules: {
      "no-unused-vars": "off",
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/no-unknown-property": [
        "error",
        { ignore: ["cmdk-input-wrapper", "toast-close"] },
      ],
      "react-hooks/rules-of-hooks": "error",
    },
  },
  // ── src/App.jsx ────────────────────────────────────────────────────────────
  // Hele appen ligger i denne ene fila, og den sto UTENFOR lintingen over.
  // Konsekvensen var seks udefinerte referanser i produksjon, tre av dem
  // render-tid — de gir hvit skjerm. esbuild fanger dem ikke; de smeller først
  // i nettleseren. «lukkMedBekreftelse» ble rettet 30. juli 11:29 og innført på
  // nytt samme kveld 19:34, uten at noe sa fra.
  //
  // Bevisst smal regelliste: no-undef og hooks-reglene. Å slå på hele
  // recommended på 79 000 linjer ville gitt tusenvis av treff og blitt slått av
  // igjen samme dag. Dette settet skal holdes på null.
  {
    files: ["src/App.jsx"],
    languageOptions: {
      globals: { ...globals.browser, React: "readonly" },
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
    },
    settings: { react: { version: "detect" } },
    rules: {
      "no-undef": "error",
      "react-hooks/rules-of-hooks": "error",
      "react/jsx-uses-vars": "error",
    },
  },
];
