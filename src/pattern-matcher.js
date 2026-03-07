function extractHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function urlMatchesPattern(url, rule) {
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

function findMatchingRule(url, rules) {
  if (!rules) return null;
  for (const rule of rules) {
    if (urlMatchesPattern(url, rule)) return rule;
  }
  return null;
}

// Export for Node.js tests, but also make available as globals for browser
if (typeof module !== "undefined" && module.exports) {
  module.exports = { urlMatchesPattern, findMatchingRule };
}
