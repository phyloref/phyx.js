import mocha from "eslint-plugin-mocha";
import jsonFormat from "eslint-plugin-json-format";
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

export default [{
    ignores: ["**/package-lock.json"],
}, ...compat.extends("airbnb-base", "plugin:mocha/recommended"), {
    plugins: {
        mocha,
        "json-format": jsonFormat,
    },

    languageOptions: {
        globals: {},
        ecmaVersion: 6,
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
}];