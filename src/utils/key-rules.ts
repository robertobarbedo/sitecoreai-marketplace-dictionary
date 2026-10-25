import type { KeyRule } from "@/src/types";

function splitWords(name: string): string[] {
  return name
    .trim()
    .split(/[\s_\-.,]+/)
    .filter(Boolean);
}

export function deriveKey(name: string, rule: KeyRule): string {
  const words = splitWords(name);
  if (words.length === 0) return "";

  switch (rule) {
    case "PascalCase":
      return words
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join("");

    case "camelCase":
      return words
        .map((w, i) =>
          i === 0
            ? w.toLowerCase()
            : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        )
        .join("");

    case "dot.notation":
      return words.map((w) => w.toLowerCase()).join(".");

    case "DOT.NOTATION":
      return words.map((w) => w.toUpperCase()).join(".");

    case "snake_case":
      return words.map((w) => w.toLowerCase()).join("_");

    case "UPPER_SNAKE":
      return words.map((w) => w.toUpperCase()).join("_");

    case "kebab-case":
      return words.map((w) => w.toLowerCase()).join("-");

    case "UPPER_KEBAB":
      return words.map((w) => w.toUpperCase()).join("-");

    case "Title Case":
      return words
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");

    case "lowercase":
      return words.map((w) => w.toLowerCase()).join(" ");

    default:
      return name;
  }
}

export const KEY_RULE_OPTIONS: { value: KeyRule; label: string; example: string }[] = [
  { value: "PascalCase", label: "PascalCase", example: "WelcomeMessage" },
  { value: "camelCase", label: "camelCase", example: "welcomeMessage" },
  { value: "dot.notation", label: "dot.notation", example: "welcome.message" },
  { value: "DOT.NOTATION", label: "DOT.NOTATION", example: "WELCOME.MESSAGE" },
  { value: "snake_case", label: "snake_case", example: "welcome_message" },
  { value: "UPPER_SNAKE", label: "UPPER_SNAKE", example: "WELCOME_MESSAGE" },
  { value: "kebab-case", label: "kebab-case", example: "welcome-message" },
  { value: "UPPER_KEBAB", label: "UPPER-KEBAB", example: "WELCOME-MESSAGE" },
  { value: "Title Case", label: "Title Case", example: "Welcome Message" },
  { value: "lowercase", label: "lowercase", example: "welcome message" },
];
