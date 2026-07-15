/* import eslint specialized for typescript, because normally it only know javascript
typescriptparser is basically the translator between typescript and eslint */
import eslintPluginTypescript from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";

export default [
  {
    files: ["src/**/*.ts"], //Where to search files (** each subfolder), (*.ts each file that ends with .ts)
    languageOptions: {
      parser: typescriptParser, // The traductor we imported
      parserOptions: {
        ecmaVersion: "latest", // Most modern syntaxis for typescript
        sourceType: "module" // Indicates that the script uses import and export instead of require
      }
    },
    plugins: {
      "@typescript-eslint": eslintPluginTypescript //Imports the rule book, the one that was installed in package.json
    },
    //Warnings and punishment manual
    rules: {
      ...eslintPluginTypescript.configs.recommended.rules,
      "no-console": "warn", // Just a warning for console logs
      "@typescript-eslint/no-unused-vars": "warn" // Same but for variables
    }
  }
];