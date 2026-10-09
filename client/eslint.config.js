import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default [
  { ignores: ["dist"] },
  js.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { "react-refresh": reactRefresh },
    rules: {
      // JSX usage is not visible to core no-unused-vars without eslint-plugin-react;
      // the capitalised pattern covers components and icons used only in JSX.
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]", argsIgnorePattern: "^_", ignoreRestSiblings: true }],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "no-console": "error",
    },
  },
];
