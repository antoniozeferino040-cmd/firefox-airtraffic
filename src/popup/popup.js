const containerSelect = document.getElementById("container-select");
const patternInput = document.getElementById("pattern-input");
const matchTypeSelect = document.getElementById("match-type-select");
const matchHint = document.getElementById("match-hint");
const form = document.getElementById("add-rule-form");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");
const rulesList = document.getElementById("rules-list");

let editingRuleId = null;
let settings = { mode: "route_matched", defaultContainer: "", useSync: false };

const CONTAINER_COLORS = {
  blue: "#37adff", turquoise: "#00c79a", green: "#51cd00",
  yellow: "#ffcb00", orange: "#ff9f00", red: "#ff613d",
  pink: "#ff4bda", purple: "#af51f5", toolbar: "#7c7c7d",
};

const MATCH_TYPE_CONFIG = {
  domain:         { placeholder: "github.com",              hint: "Matches github.com and all subdomains",    label: "Domain" },
  domainContains: { placeholder: "google",                  hint: "Matches any domain containing \"google\"", label: "Domain contains" },
  contains:       { placeholder: "buser",                   hint: "Matches any URL containing this text",     label: "URL contains" },
  wildcard:       { placeholder: "*.github.com/avelino/*",  hint: "Use * as wildcard for any characters",     label: "Wildcard" },
  regex:          { placeholder: "^https://(www\\.)?g.*",   hint: "Regular expression (advanced)",            label: "Regex" },
};

function updateMatchTypeHints() {
  const config = MATCH_TYPE_CONFIG[matchTypeSelect.value];
  patternInput.placeholder = config.placeholder;
  matchHint.textContent = config.hint;
}

matchTypeSelect.addEventListener("change", updateMatchTypeHints);

const CONTAINER_ICONS = {
  fingerprint: "\uD83D\uDD90\uFE0F",
  briefcase: "\uD83D\uDCBC",
  dollar: "\uD83D\uDCB2",
  cart: "\uD83D\uDED2",
  circle: "\u2B55",
  gift: "\uD83C\uDF81",
  vacation: "\u2708\uFE0F",
  food: "\uD83C\uDF54",
  fruit: "\uD83C\uDF4E",
  pet: "\uD83D\uDC3E",
  tree: "\uD83C\uDF33",
  chill: "\u2744\uFE0F",
  fence: "\uD83C\uDF1F",
};

let containers = [];

function getStorage() {
  return settings.useSync ? browser.storage.sync : browser.storage.local;
}

async function loadContainers() {
  containers = await browser.contextualIdentities.query({});
  containerSelect.innerHTML = '<option value="">Select container...</option>';
  for (const c of containers) {
    const icon = CONTAINER_ICONS[c.icon] || "";
    const opt = document.createElement("option");
    opt.value = c.cookieStoreId;
    opt.textContent = `${icon} ${c.name}`;
    containerSelect.appendChild(opt);
  }
}

async function loadSettings() {
  const data = await browser.storage.local.get("settings");
  settings = data.settings || settings;
}

async function loadRules() {
  const storage = getStorage();
  const data = await storage.get("rules");
  const rules = data.rules || [];
  renderRules(rules);
}

function getContainerName(cookieStoreId) {
  const c = containers.find((c) => c.cookieStoreId === cookieStoreId);
  return c ? c.name : cookieStoreId;
}

function getContainerColor(cookieStoreId) {
  const c = containers.find((c) => c.cookieStoreId === cookieStoreId);
  if (!c) return "#555";
  return CONTAINER_COLORS[c.color] || "#555";
}

// Drag & drop
let draggedItem = null;
let draggedIndex = -1;

function renderRules(rules) {
  rulesList.innerHTML = "";
  rules.forEach((rule, index) => {
    const li = document.createElement("li");
    li.draggable = true;
    li.dataset.index = index;

    const handle = document.createElement("span");
    handle.className = "drag-handle";
    handle.textContent = "\u2630";

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

    li.appendChild(handle);
    li.appendChild(info);
    li.appendChild(badge);
    li.appendChild(actions);

    li.addEventListener("dragstart", (e) => {
      draggedItem = li;
      draggedIndex = index;
      li.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });

    li.addEventListener("dragend", () => {
      li.classList.remove("dragging");
      document.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
      draggedItem = null;
    });

    li.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (draggedItem && draggedItem !== li) li.classList.add("drag-over");
    });

    li.addEventListener("dragleave", () => li.classList.remove("drag-over"));

    li.addEventListener("drop", async (e) => {
      e.preventDefault();
      li.classList.remove("drag-over");
      const targetIndex = parseInt(li.dataset.index);
      if (draggedIndex === targetIndex) return;
      const storage = getStorage();
      const data = await storage.get("rules");
      const currentRules = data.rules || [];
      const [moved] = currentRules.splice(draggedIndex, 1);
      currentRules.splice(targetIndex, 0, moved);
      await saveRules(currentRules);
    });

    rulesList.appendChild(li);
  });
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
  const storage = getStorage();
  await storage.set({ rules });
  renderRules(rules);
}

async function deleteRule(id) {
  const storage = getStorage();
  const data = await storage.get("rules");
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

  const storage = getStorage();
  const data = await storage.get("rules");
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
    rules.push({ id: crypto.randomUUID(), pattern, matchType, cookieStoreId });
    patternInput.value = "";
  }

  await saveRules(rules);
});

cancelBtn.addEventListener("click", cancelEdit);

// Open settings page
document.getElementById("open-settings").addEventListener("click", (e) => {
  e.preventDefault();
  browser.runtime.openOptionsPage();
});

// Init
updateMatchTypeHints();
(async () => {
  await loadContainers();
  await loadSettings();
  await loadRules();
})();
