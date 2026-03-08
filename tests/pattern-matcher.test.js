const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { findMatchingRule, urlMatchesPattern } = require("../src/pattern-matcher.js");

describe("urlMatchesPattern", () => {
  it("matches contains pattern (case insensitive)", () => {
    const rule = { pattern: "buser", matchType: "contains", cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://app.buser.com.br/tickets", rule), true);
    assert.equal(urlMatchesPattern("https://BUSER.com.br", rule), true);
    assert.equal(urlMatchesPattern("https://example.com", rule), false);
  });

  it("matches startsWith pattern", () => {
    const rule = { pattern: "https://github.com", matchType: "startsWith", cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://github.com/avelino", rule), true);
    assert.equal(urlMatchesPattern("https://gitlab.com/github.com", rule), false);
  });

  it("matches startsWith pattern (case insensitive)", () => {
    const rule = { pattern: "https://GitHub.com", matchType: "startsWith", cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://github.com/repo", rule), true);
  });

  it("matches regex pattern", () => {
    const rule = { pattern: "^https://(www\\.)?github\\.com", matchType: "regex", cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://github.com/avelino", rule), true);
    assert.equal(urlMatchesPattern("https://www.github.com/avelino", rule), true);
    assert.equal(urlMatchesPattern("https://gitlab.com", rule), false);
  });

  it("returns false for invalid regex (does not throw)", () => {
    const rule = { pattern: "[invalid(", matchType: "regex", cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://example.com", rule), false);
  });

  it("matches domain exactly and subdomains", () => {
    const rule = { pattern: "github.com", matchType: "domain", cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://github.com/avelino", rule), true);
    assert.equal(urlMatchesPattern("https://www.github.com/avelino", rule), true);
    assert.equal(urlMatchesPattern("https://api.github.com/repos", rule), true);
    assert.equal(urlMatchesPattern("https://notgithub.com", rule), false);
    assert.equal(urlMatchesPattern("https://github.company.com", rule), false);
    assert.equal(urlMatchesPattern("https://fakegithub.com.br", rule), false);
  });

  it("matches domain case insensitive", () => {
    const rule = { pattern: "GitHub.com", matchType: "domain", cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://github.com/repo", rule), true);
  });

  it("matches domain with invalid URL gracefully", () => {
    const rule = { pattern: "github.com", matchType: "domain", cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("not-a-url", rule), false);
    assert.equal(urlMatchesPattern("", rule), false);
  });

  it("matches domainContains for partial domain match", () => {
    const rule = { pattern: "google", matchType: "domainContains", cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://mail.google.com", rule), true);
    assert.equal(urlMatchesPattern("https://docs.google.com.br", rule), true);
    assert.equal(urlMatchesPattern("https://google.com", rule), true);
    assert.equal(urlMatchesPattern("https://example.com/search?q=google", rule), false);
  });

  it("matches domainContains case insensitive", () => {
    const rule = { pattern: "Google", matchType: "domainContains", cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://docs.google.com", rule), true);
  });

  it("matches domainContains with invalid URL gracefully", () => {
    const rule = { pattern: "google", matchType: "domainContains", cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("not-a-url", rule), false);
  });

  it("returns false for unknown matchType", () => {
    const rule = { pattern: "test", matchType: "unknown", cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://test.com", rule), false);
  });

  it("matches wildcard pattern with * as glob", () => {
    const rule = { pattern: "*.github.com", matchType: "wildcard", cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://api.github.com/repos", rule), true);
    assert.equal(urlMatchesPattern("https://www.github.com", rule), true);
    // *.github.com requires a char before .github.com — use "domain" type for exact+subdomain matching
    assert.equal(urlMatchesPattern("https://github.com", rule), false);
  });

  it("matches wildcard with ** prefix for any URL", () => {
    const rule = { pattern: "*github.com*", matchType: "wildcard", cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://github.com/avelino", rule), true);
    assert.equal(urlMatchesPattern("https://api.github.com", rule), true);
    assert.equal(urlMatchesPattern("https://fakegithub.com", rule), true); // glob is loose, use domain for strict
  });

  it("matches wildcard pattern with path glob", () => {
    const rule = { pattern: "github.com/avelino/*", matchType: "wildcard", cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://github.com/avelino/firefox-airtraffic", rule), true);
    assert.equal(urlMatchesPattern("https://github.com/avelino/", rule), true);
    assert.equal(urlMatchesPattern("https://github.com/other/repo", rule), false);
  });

  it("matches wildcard case insensitive", () => {
    const rule = { pattern: "*.GitHub.COM/*", matchType: "wildcard", cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://api.github.com/repos", rule), true);
  });

  it("wildcard with no * acts as contains", () => {
    const rule = { pattern: "github.com", matchType: "wildcard", cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://github.com/avelino", rule), true);
    assert.equal(urlMatchesPattern("https://example.com", rule), false);
  });

  it("wildcard escapes regex special chars", () => {
    const rule = { pattern: "github.com/avelino/*", matchType: "wildcard", cookieStoreId: "firefox-container-1" };
    // The dot should be literal, not regex any-char
    assert.equal(urlMatchesPattern("https://githubXcom/avelino/test", rule), false);
  });
});

describe("findMatchingRule", () => {
  const rules = [
    { id: "1", pattern: "github.com", matchType: "contains", cookieStoreId: "firefox-container-1" },
    { id: "2", pattern: "buser", matchType: "contains", cookieStoreId: "firefox-container-2" },
    { id: "3", pattern: "^https://slack\\.com", matchType: "regex", cookieStoreId: "firefox-container-3" },
  ];

  it("returns the first matching rule", () => {
    const result = findMatchingRule("https://github.com/avelino", rules);
    assert.deepEqual(result, rules[0]);
  });

  it("returns null when no rule matches", () => {
    const result = findMatchingRule("https://example.com", rules);
    assert.equal(result, null);
  });

  it("returns null for empty rules array", () => {
    assert.equal(findMatchingRule("https://github.com", []), null);
  });

  it("returns null for undefined/null rules", () => {
    assert.equal(findMatchingRule("https://github.com", undefined), null);
    assert.equal(findMatchingRule("https://github.com", null), null);
  });

  it("first matching rule wins (order matters)", () => {
    const overlapping = [
      { id: "a", pattern: "github", matchType: "contains", cookieStoreId: "firefox-container-1" },
      { id: "b", pattern: "github.com", matchType: "contains", cookieStoreId: "firefox-container-2" },
    ];
    const result = findMatchingRule("https://github.com", overlapping);
    assert.equal(result.id, "a");
  });
});
