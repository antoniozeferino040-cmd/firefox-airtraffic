import type { Rule } from "./types";

function extractHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function urlMatchesPattern(url: string, rule: Rule): boolean {
  const lowerUrl = url.toLowerCase();
  const lowerPattern = rule.pattern.toLowerCase();

  switch (rule.matchType) {
    case "domain": {
      const hostname = extractHostname(url);
      if (!hostname) return false;
      return hostname === lowerPattern || hostname.endsWith("." + lowerPattern);
    }
    case "domainContains": {
      const hostname = extractHostname(url);
      if (!hostname) return false;
      return hostname.includes(lowerPattern);
    }
    case "contains":
      return lowerUrl.includes(lowerPattern);
    case "startsWith":
      return lowerUrl.startsWith(lowerPattern);
    case "wildcard": {
      const escaped = lowerPattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
      try {
        return new RegExp(escaped, "i").test(url);
      } catch {
        return false;
      }
    }
    case "regex":
      try {
        return new RegExp(rule.pattern, "i").test(url);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

export function findMatchingRule(url: string, rules: Rule[] | null | undefined): Rule | null {
  if (!rules) return null;
  for (const rule of rules) {
    if (urlMatchesPattern(url, rule)) return rule;
  }
  return null;
}
