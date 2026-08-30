import type { UserConfig } from "@commitlint/types";

const config: UserConfig = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Subject line only: config-conventional formats a body/footer if present,
    // it does not forbid them.
    "body-empty": [2, "always"],
    "footer-empty": [2, "always"],
  },
};

export default config;
