// eslint-config-next >= 16 ships native flat config - kein FlatCompat nötig
// (die Legacy-Compat-Schicht kollidiert mit eslint-plugin-reacts
// selbstreferenzierendem flat-config-Export, siehe
// https://github.com/vercel/next.js/issues/85244).
import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [...coreWebVitals, ...nextTypescript];

export default eslintConfig;
