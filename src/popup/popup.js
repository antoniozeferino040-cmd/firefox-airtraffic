// Popup: lightweight rule management. Settings/containers in options page.

initRulesUI({
  rulesList: document.getElementById("rules-list"),
  patternInput: document.getElementById("pattern-input"),
  matchTypeSelect: document.getElementById("match-type-select"),
  containerSelect: document.getElementById("container-select"),
  submitBtn: document.getElementById("submit-btn"),
  cancelBtn: document.getElementById("cancel-btn"),
  matchHint: document.getElementById("match-hint"),
  form: document.getElementById("add-rule-form"),
});

document.getElementById("open-settings").addEventListener("click", (e) => {
  e.preventDefault();
  browser.runtime.openOptionsPage();
});

(async () => {
  await loadContainerList();
  populateContainerSelect(document.getElementById("container-select"));
  await loadSettingsFromStorage();
  const rules = await loadRulesFromStorage();
  setRules(rules);
  renderRulesList(rules);
})();
