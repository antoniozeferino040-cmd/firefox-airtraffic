import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { findMatchingRule, urlMatchesPattern } from "../src/pattern-matcher";

describe("urlMatchesPattern", () => {
  it("matches contains pattern (case insensitive)", () => {
    const rule = { id: "1", pattern: "buser", matchType: "contains" as const, cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://app.buser.com.br/tickets", rule), true);
    assert.equal(urlMatchesPattern("https://BUSER.com.br", rule), true);
    assert.equal(urlMatchesPattern("https://example.com", rule), false);
  });

  it("matches startsWith pattern", () => {
    const rule = { id: "1", pattern: "https://github.com", matchType: "startsWith" as const, cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://github.com/avelino", rule), true);
    assert.equal(urlMatchesPattern("https://gitlab.com/github.com", rule), false);
  });

  it("matches startsWith pattern (case insensitive)", () => {
    const rule = { id: "1", pattern: "https://GitHub.com", matchType: "startsWith" as const, cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://github.com/repo", rule), true);
  });

  it("matches regex pattern", () => {
    const rule = { id: "1", pattern: "^https://(www\\.)?github\\.com", matchType: "regex" as const, cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://github.com/avelino", rule), true);
    assert.equal(urlMatchesPattern("https://www.github.com/avelino", rule), true);
    assert.equal(urlMatchesPattern("https://gitlab.com", rule), false);
  });

  it("returns false for invalid regex (does not throw)", () => {
    const rule = { id: "1", pattern: "[invalid(", matchType: "regex" as const, cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://example.com", rule), false);
  });

  it("matches domain exactly and subdomains", () => {
    const rule = { id: "1", pattern: "github.com", matchType: "domain" as const, cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://github.com/avelino", rule), true);
    assert.equal(urlMatchesPattern("https://www.github.com/avelino", rule), true);
    assert.equal(urlMatchesPattern("https://api.github.com/repos", rule), true);
    assert.equal(urlMatchesPattern("https://notgithub.com", rule), false);
    assert.equal(urlMatchesPattern("https://github.company.com", rule), false);
    assert.equal(urlMatchesPattern("https://fakegithub.com.br", rule), false);
  });

  it("matches domain case insensitive", () => {
    const rule = { id: "1", pattern: "GitHub.com", matchType: "domain" as const, cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://github.com/repo", rule), true);
  });

  it("matches domain with invalid URL gracefully", () => {
    const rule = { id: "1", pattern: "github.com", matchType: "domain" as const, cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("not-a-url", rule), false);
    assert.equal(urlMatchesPattern("", rule), false);
  });

  it("matches domainContains for partial domain match", () => {
    const rule = { id: "1", pattern: "google", matchType: "domainContains" as const, cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://mail.google.com", rule), true);
    assert.equal(urlMatchesPattern("https://docs.google.com.br", rule), true);
    assert.equal(urlMatchesPattern("https://google.com", rule), true);
    assert.equal(urlMatchesPattern("https://example.com/search?q=google", rule), false);
  });

  it("matches domainContains case insensitive", () => {
    const rule = { id: "1", pattern: "Google", matchType: "domainContains" as const, cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://docs.google.com", rule), true);
  });

  it("matches domainContains with invalid URL gracefully", () => {
    const rule = { id: "1", pattern: "google", matchType: "domainContains" as const, cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("not-a-url", rule), false);
  });

  it("returns false for unknown matchType", () => {
    const rule = { id: "1", pattern: "test", matchType: "unknown" as const, cookieStoreId: "firefox-container-1" };
    // @ts-expect-error testing invalid matchType
    assert.equal(urlMatchesPattern("https://test.com", rule), false);
  });

  it("matches wildcard pattern with * as glob", () => {
    const rule = { id: "1", pattern: "*.github.com", matchType: "wildcard" as const, cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://api.github.com/repos", rule), true);
    assert.equal(urlMatchesPattern("https://www.github.com", rule), true);
    assert.equal(urlMatchesPattern("https://github.com", rule), false);
  });

  it("matches wildcard with ** prefix for any URL", () => {
    const rule = { id: "1", pattern: "*github.com*", matchType: "wildcard" as const, cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://github.com/avelino", rule), true);
    assert.equal(urlMatchesPattern("https://api.github.com", rule), true);
    assert.equal(urlMatchesPattern("https://fakegithub.com", rule), true);
  });

  it("matches wildcard pattern with path glob", () => {
    const rule = { id: "1", pattern: "github.com/avelino/*", matchType: "wildcard" as const, cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://github.com/avelino/firefox-airtraffic", rule), true);
    assert.equal(urlMatchesPattern("https://github.com/avelino/", rule), true);
    assert.equal(urlMatchesPattern("https://github.com/other/repo", rule), false);
  });

  it("matches wildcard case insensitive", () => {
    const rule = { id: "1", pattern: "*.GitHub.COM/*", matchType: "wildcard" as const, cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://api.github.com/repos", rule), true);
  });

  it("wildcard with no * acts as contains", () => {
    const rule = { id: "1", pattern: "github.com", matchType: "wildcard" as const, cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://github.com/avelino", rule), true);
    assert.equal(urlMatchesPattern("https://example.com", rule), false);
  });

  it("wildcard escapes regex special chars", () => {
    const rule = { id: "1", pattern: "github.com/avelino/*", matchType: "wildcard" as const, cookieStoreId: "firefox-container-1" };
    assert.equal(urlMatchesPattern("https://githubXcom/avelino/test", rule), false);
  });
});

describe("findMatchingRule", () => {
  const rules = [
    { id: "1", pattern: "github.com", matchType: "contains" as const, cookieStoreId: "firefox-container-1" },
    { id: "2", pattern: "buser", matchType: "contains" as const, cookieStoreId: "firefox-container-2" },
    { id: "3", pattern: "^https://slack\\.com", matchType: "regex" as const, cookieStoreId: "firefox-container-3" },
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
      { id: "a", pattern: "github", matchType: "contains" as const, cookieStoreId: "firefox-container-1" },
      { id: "b", pattern: "github.com", matchType: "contains" as const, cookieStoreId: "firefox-container-2" },
    ];
    const result = findMatchingRule("https://github.com", overlapping);
    assert.equal(result?.id, "a");
  });
});
