const containerSelect = document.getElementById("container-select");
const patternInput = document.getElementById("pattern-input");
const matchTypeSelect = document.getElementById("match-type-select");
const matchHint = document.getElementById("match-hint");
const form = document.getElementById("add-rule-form");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");
const rulesList = document.getElementById("rules-list");

let editingRuleId = null;

const MATCH_TYPE_CONFIG = {
  domain:         { placeholder: "github.com",           hint: "Matches github.com and all subdomains",    label: "Domain" },
  domainContains: { placeholder: "google",               hint: "Matches any domain containing \"google\"", label: "Domain contains" },
  contains:       { placeholder: "buser",                hint: "Matches any URL containing this text",     label: "URL contains" },
  regex:          { placeholder: "^https://(www\\.)?g.*", hint: "Regular expression (advanced)",            label: "Regex" },
};

function updateMatchTypeHints() {
  const config = MATCH_TYPE_CONFIG[matchTypeSelect.value];
  patternInput.placeholder = config.placeholder;
  matchHint.textContent = config.hint;
}

matchTypeSelect.addEventListener("change", updateMatchTypeHints);

let containers = [];

async function loadContainers() {
  containers = await browser.contextualIdentities.query({});
  containerSelect.innerHTML = '<option value="">Select container...</option>';
  for (const c of containers) {
    const opt = document.createElement("option");
    opt.value = c.cookieStoreId;
    opt.textContent = c.name;
    containerSelect.appendChild(opt);
  }
}

async function loadRules() {
  const data = await browser.storage.local.get("rules");
  const rules = data.rules || [];
  renderRules(rules);
}

function getContainerName(cookieStoreId) {
  const c = containers.find((c) => c.cookieStoreId === cookieStoreId);
  return c ? c.name : cookieStoreId;
}

function getContainerColor(cookieStoreId) {
  const c = containers.find((c) => c.cookieStoreId === cookieStoreId);
  return c ? c.colorCode : "#555";
}

function renderRules(rules) {
  rulesList.innerHTML = "";
  for (const rule of rules) {
    const li = document.createElement("li");

    const info = document.createElement("div");
    info.className = "rule-info";

    const pattern = document.createElement("span");
    pattern.className = "rule-pattern";
    pattern.textContent = rule.pattern;

    const meta = document.createElement("span");
    meta.className = "rule-meta";
    meta.textContent = (MATCH_TYPE_CONFIG[rule.matchType] || {}).label || rule.matchType;

    info.appendChild(pattern);
    info.appendChild(meta);

    const badge = document.createElement("span");
    badge.className = "container-badge";
    badge.style.backgroundColor = getContainerColor(rule.cookieStoreId);
    badge.textContent = getContainerName(rule.cookieStoreId);

    const actions = document.createElement("div");
    actions.className = "rule-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    editBtn.textContent = "\u270E";
    editBtn.title = "Edit";
    editBtn.addEventListener("click", () => startEdit(rule));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "\u00d7";
    deleteBtn.title = "Delete";
    deleteBtn.addEventListener("click", () => deleteRule(rule.id));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(info);
    li.appendChild(badge);
    li.appendChild(actions);
    rulesList.appendChild(li);
  }
}

function startEdit(rule) {
  editingRuleId = rule.id;
  patternInput.value = rule.pattern;
  matchTypeSelect.value = rule.matchType;
  containerSelect.value = rule.cookieStoreId;
  submitBtn.textContent = "Save";
  cancelBtn.hidden = false;
  updateMatchTypeHints();
  patternInput.focus();
}

function cancelEdit() {
  editingRuleId = null;
  patternInput.value = "";
  matchTypeSelect.value = "domain";
  containerSelect.value = "";
  submitBtn.textContent = "Add Rule";
  cancelBtn.hidden = true;
  updateMatchTypeHints();
}

async function saveRules(rules) {
  await browser.storage.local.set({ rules });
  renderRules(rules);
}

async function deleteRule(id) {
  const data = await browser.storage.local.get("rules");
  const rules = (data.rules || []).filter((r) => r.id !== id);
  if (editingRuleId === id) cancelEdit();
  await saveRules(rules);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const pattern = patternInput.value.trim();
  const matchType = matchTypeSelect.value;
  const cookieStoreId = containerSelect.value;
  if (!pattern || !cookieStoreId) return;

  const data = await browser.storage.local.get("rules");
  const rules = data.rules || [];

  if (editingRuleId) {
    const rule = rules.find((r) => r.id === editingRuleId);
    if (rule) {
      rule.pattern = pattern;
      rule.matchType = matchType;
      rule.cookieStoreId = cookieStoreId;
    }
    cancelEdit();
  } else {
    rules.push({
      id: crypto.randomUUID(),
      pattern,
      matchType,
      cookieStoreId,
    });
    patternInput.value = "";
  }

  await saveRules(rules);
});

cancelBtn.addEventListener("click", cancelEdit);

updateMatchTypeHints();
loadContainers();
loadRules();
