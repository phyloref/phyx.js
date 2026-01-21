import { defineConfig, globalIgnores } from "eslint/config";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import mocha from "eslint-plugin-mocha";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([
    globalIgnores(["package-lock.json", "docs/"]
), {
    plugins: {
        mocha,
        json,
    },

    languageOptions: {
        globals: {},
        ecmaVersion: "latest",
        sourceType: "module",

        parserOptions: {
            parser: "babel-eslint",
        },
    },

    rules: {
        "prefer-destructuring": "off",

        "comma-dangle": ["error", {
            arrays: "always-multiline",
            objects: "always-multiline",
            imports: "always-multiline",
            exports: "always-multiline",
            functions: "ignore",
        }],
    },
}, {
    files: ["**/*.json"],
    language: "json/json",
    rules: {
        "json/no-duplicate-keys": "error",
    }
}, {
   files: ["**/*.md"],
   plugins: {
       markdown
   },
   language: "markdown/commonmark",
   rules: {
       "markdown/no-html": "error"
   }
}]);
