// Options page: containers CRUD, settings, import/export, rules with search.
// Shared logic comes from constants.js, storage.js, containers.js, rules-ui.js.

const containerSelect = document.getElementById("container-select");
const defaultContainerSelect = document.getElementById("default-container-select");
const rulesSearch = document.getElementById("rules-search");
const rulesEmpty = document.getElementById("rules-empty");

// Settings
const modeSelect = document.getElementById("mode-select");
const defaultContainerRow = document.getElementById("default-container-row");
const syncToggle = document.getElementById("sync-toggle");

// Containers
const containerForm = document.getElementById("container-form");
const containerNameInput = document.getElementById("container-name-input");
const containerColorSelect = document.getElementById("container-color-select");
const containerIconSelect = document.getElementById("container-icon-select");
const containerSubmitBtn = document.getElementById("container-submit-btn");
const containerCancelBtn = document.getElementById("container-cancel-btn");
const containersList = document.getElementById("containers-list");

// Import/Export
const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const importFile = document.getElementById("import-file");

let editingContainerId = null;

// --- Init shared rules UI ---
initRulesUI({
  rulesList: document.getElementById("rules-list"),
  patternInput: document.getElementById("pattern-input"),
  matchTypeSelect: document.getElementById("match-type-select"),
  containerSelect,
  submitBtn: document.getElementById("submit-btn"),
  cancelBtn: document.getElementById("cancel-btn"),
  matchHint: document.getElementById("match-hint"),
  form: document.getElementById("add-rule-form"),
  onRulesChanged: () => {
    rulesEmpty.hidden = getRules().length > 0;
  },
});

// --- Search / filter ---
rulesSearch.addEventListener("input", () => {
  const query = rulesSearch.value.toLowerCase().trim();
  const all = getRules();
  const filtered = query
    ? all.filter((r) => r.pattern.toLowerCase().includes(query) || getContainerName(r.cookieStoreId).toLowerCase().includes(query))
    : all;
  renderRulesList(filtered);
});

// --- Containers CRUD ---

function populateIconSelect() {
  containerIconSelect.innerHTML = "";
  for (const [value, emoji] of Object.entries(CONTAINER_ICONS)) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = `${emoji} ${value}`;
    containerIconSelect.appendChild(opt);
  }
}

function renderContainers() {
  containersList.innerHTML = "";
  for (const c of airtrafficContainers) {
    const li = document.createElement("li");
    li.className = "container-item";

    const dot = document.createElement("span");
    dot.className = "container-color-dot";
    dot.style.backgroundColor = CONTAINER_COLORS[c.color] || "#555";

    const icon = document.createElement("span");
    icon.className = "container-item-icon";
    icon.textContent = CONTAINER_ICONS[c.icon] || "";

    const name = document.createElement("span");
    name.className = "container-item-name";
    name.textContent = c.name;

    const actions = document.createElement("div");
    actions.className = "rule-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    editBtn.textContent = "\u270E";
    editBtn.title = "Edit";
    editBtn.addEventListener("click", () => startContainerEdit(c));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "\u00d7";
    deleteBtn.title = "Delete";
    deleteBtn.addEventListener("click", () => deleteContainer(c.cookieStoreId));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(dot);
    li.appendChild(icon);
    li.appendChild(name);
    li.appendChild(actions);
    containersList.appendChild(li);
  }
}

function startContainerEdit(c) {
  editingContainerId = c.cookieStoreId;
  containerNameInput.value = c.name;
  containerColorSelect.value = c.color;
  containerIconSelect.value = c.icon;
  containerSubmitBtn.textContent = "Save";
  containerCancelBtn.hidden = false;
  containerNameInput.focus();
}

function cancelContainerEdit() {
  editingContainerId = null;
  containerNameInput.value = "";
  containerColorSelect.value = "blue";
  containerIconSelect.value = "fingerprint";
  containerSubmitBtn.textContent = "Create";
  containerCancelBtn.hidden = true;
}

containerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = containerNameInput.value.trim();
  if (!name) return;

  const color = containerColorSelect.value;
  const icon = containerIconSelect.value;

  if (editingContainerId) {
    await browser.contextualIdentities.update(editingContainerId, { name, color, icon });
    cancelContainerEdit();
  } else {
    await browser.contextualIdentities.create({ name, color, icon });
    containerNameInput.value = "";
  }

  await refreshContainers();
});

containerCancelBtn.addEventListener("click", cancelContainerEdit);

async function deleteContainer(cookieStoreId) {
  if (!confirm("Delete this container? Tabs in it will be closed.")) return;
  await browser.contextualIdentities.remove(cookieStoreId);
  if (editingContainerId === cookieStoreId) cancelContainerEdit();
  await refreshContainers();
}

async function refreshContainers() {
  await loadContainerList();
  populateContainerSelect(containerSelect, "Container...");
  populateContainerSelect(defaultContainerSelect, "Select...");
  renderContainers();
  renderRulesList(getRules());
}

// --- Settings ---

async function applySettings() {
  const s = await loadSettingsFromStorage();
  modeSelect.value = s.mode;
  syncToggle.checked = s.useSync;
  defaultContainerSelect.value = s.defaultContainer;
  defaultContainerRow.hidden = s.mode !== "route_all";
}

modeSelect.addEventListener("change", () => {
  defaultContainerRow.hidden = modeSelect.value !== "route_all";
  saveSettingsToStorage({ mode: modeSelect.value });
});

defaultContainerSelect.addEventListener("change", () => {
  saveSettingsToStorage({ defaultContainer: defaultContainerSelect.value });
});

syncToggle.addEventListener("change", async () => {
  const wasSync = airtrafficSettings.useSync;
  const nowSync = syncToggle.checked;
  if (wasSync !== nowSync) await migrateRulesStorage(wasSync, nowSync);
  await saveSettingsToStorage({ useSync: nowSync });
  const rules = await loadRulesFromStorage();
  setRules(rules);
  renderRulesList(rules);
});

// --- Import / Export ---

exportBtn.addEventListener("click", async () => {
  const rules = await loadRulesFromStorage();
  const s = await loadSettingsFromStorage();

  const blob = new Blob([JSON.stringify({ version: 1, rules, settings: s }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "air-traffic-rules.json";
  a.click();
  URL.revokeObjectURL(url);
});

importBtn.addEventListener("click", () => importFile.click());

importFile.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const data = JSON.parse(await file.text());

    if (!Array.isArray(data.rules)) {
      alert("Invalid file: no rules found.");
      return;
    }

    for (const rule of data.rules) {
      if (!rule.pattern || !rule.matchType || !rule.cookieStoreId) {
        alert("Invalid file: rules are missing required fields.");
        return;
      }
      if (!rule.id) rule.id = crypto.randomUUID();
    }

    await saveRulesToStorage(data.rules);
    if (data.settings) {
      await saveSettingsToStorage(data.settings);
      await applySettings();
    }

    setRules(data.rules);
    renderRulesList(data.rules);
    rulesEmpty.hidden = data.rules.length > 0;
  } catch {
    alert("Failed to import: invalid JSON file.");
  }

  importFile.value = "";
});

// --- Init ---
populateIconSelect();
(async () => {
  await loadContainerList();
  populateContainerSelect(containerSelect, "Container...");
  populateContainerSelect(defaultContainerSelect, "Select...");
  renderContainers();
  await applySettings();
  const rules = await loadRulesFromStorage();
  setRules(rules);
  renderRulesList(rules);
  rulesEmpty.hidden = rules.length > 0;
})();
