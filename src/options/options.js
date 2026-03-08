const containerSelect = document.getElementById("container-select");
const patternInput = document.getElementById("pattern-input");
const matchTypeSelect = document.getElementById("match-type-select");
const matchHint = document.getElementById("match-hint");
const form = document.getElementById("add-rule-form");
const submitBtn = document.getElementById("submit-btn");
const cancelBtn = document.getElementById("cancel-btn");
const rulesList = document.getElementById("rules-list");
const rulesSearch = document.getElementById("rules-search");
const rulesEmpty = document.getElementById("rules-empty");

// Settings
const modeSelect = document.getElementById("mode-select");
const defaultContainerRow = document.getElementById("default-container-row");
const defaultContainerSelect = document.getElementById("default-container-select");
const syncToggle = document.getElementById("sync-toggle");
const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const importFile = document.getElementById("import-file");

// Containers
const containerForm = document.getElementById("container-form");
const containerNameInput = document.getElementById("container-name-input");
const containerColorSelect = document.getElementById("container-color-select");
const containerIconSelect = document.getElementById("container-icon-select");
const containerSubmitBtn = document.getElementById("container-submit-btn");
const containerCancelBtn = document.getElementById("container-cancel-btn");
const containersList = document.getElementById("containers-list");

let editingRuleId = null;
let editingContainerId = null;
let settings = { mode: "route_matched", defaultContainer: "", useSync: false };
let containers = [];
let allRules = [];

const CONTAINER_COLORS = {
  blue: "#37adff", turquoise: "#00c79a", green: "#51cd00",
  yellow: "#ffcb00", orange: "#ff9f00", red: "#ff613d",
  pink: "#ff4bda", purple: "#af51f5", toolbar: "#7c7c7d",
};

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

const MATCH_TYPE_CONFIG = {
  domain:         { placeholder: "github.com",              hint: "Matches github.com and all subdomains",    label: "Domain" },
  domainContains: { placeholder: "google",                  hint: "Matches any domain containing \"google\"", label: "Domain contains" },
  contains:       { placeholder: "buser",                   hint: "Matches any URL containing this text",     label: "URL contains" },
  wildcard:       { placeholder: "*.github.com/avelino/*",  hint: "Use * as wildcard for any characters",     label: "Wildcard" },
  regex:          { placeholder: "^https://(www\\.)?g.*",   hint: "Regular expression (advanced)",            label: "Regex" },
};

// --- Helpers ---

function getStorage() {
  return settings.useSync ? browser.storage.sync : browser.storage.local;
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

function updateMatchTypeHints() {
  const config = MATCH_TYPE_CONFIG[matchTypeSelect.value];
  patternInput.placeholder = config.placeholder;
  matchHint.textContent = config.hint;
}

function populateContainerSelects() {
  containerSelect.innerHTML = '<option value="">Container...</option>';
  defaultContainerSelect.innerHTML = '<option value="">Select...</option>';
  for (const c of containers) {
    const icon = CONTAINER_ICONS[c.icon] || "";
    const opt = document.createElement("option");
    opt.value = c.cookieStoreId;
    opt.textContent = `${icon} ${c.name}`;
    containerSelect.appendChild(opt);

    const opt2 = opt.cloneNode(true);
    defaultContainerSelect.appendChild(opt2);
  }
}

// --- Containers ---

async function loadContainers() {
  containers = await browser.contextualIdentities.query({});
  populateContainerSelects();
}

function renderContainers() {
  containersList.innerHTML = "";
  for (const c of containers) {
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

  await loadContainers();
  renderContainers();
  renderRules(allRules);
});

containerCancelBtn.addEventListener("click", cancelContainerEdit);

async function deleteContainer(cookieStoreId) {
  if (!confirm("Delete this container? Tabs in it will be closed.")) return;
  await browser.contextualIdentities.remove(cookieStoreId);
  if (editingContainerId === cookieStoreId) cancelContainerEdit();
  await loadContainers();
  renderContainers();
  renderRules(allRules);
}

// --- Settings ---

async function loadSettings() {
  const data = await browser.storage.local.get("settings");
  settings = data.settings || settings;
  modeSelect.value = settings.mode;
  syncToggle.checked = settings.useSync;
  defaultContainerSelect.value = settings.defaultContainer;
  defaultContainerRow.hidden = settings.mode !== "route_all";
}

async function saveSettings() {
  settings.mode = modeSelect.value;
  settings.defaultContainer = defaultContainerSelect.value;
  settings.useSync = syncToggle.checked;
  await browser.storage.local.set({ settings });
}

modeSelect.addEventListener("change", () => {
  defaultContainerRow.hidden = modeSelect.value !== "route_all";
  saveSettings();
});

defaultContainerSelect.addEventListener("change", saveSettings);

syncToggle.addEventListener("change", async () => {
  const wasSync = settings.useSync;
  const nowSync = syncToggle.checked;

  if (wasSync !== nowSync) {
    const oldStorage = wasSync ? browser.storage.sync : browser.storage.local;
    const newStorage = nowSync ? browser.storage.sync : browser.storage.local;
    const data = await oldStorage.get("rules");
    await newStorage.set({ rules: data.rules || [] });
  }

  await saveSettings();
  await loadRules();
});

// --- Import / Export ---

exportBtn.addEventListener("click", async () => {
  const storage = getStorage();
  const data = await storage.get("rules");
  const settingsData = await browser.storage.local.get("settings");

  const exportData = {
    version: 1,
    rules: data.rules || [],
    settings: settingsData.settings || {},
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
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
    const text = await file.text();
    const importData = JSON.parse(text);

    if (!importData.rules || !Array.isArray(importData.rules)) {
      alert("Invalid file: no rules found.");
      return;
    }

    for (const rule of importData.rules) {
      if (!rule.pattern || !rule.matchType || !rule.cookieStoreId) {
        alert("Invalid file: rules are missing required fields.");
        return;
      }
      if (!rule.id) rule.id = crypto.randomUUID();
    }

    const storage = getStorage();
    await storage.set({ rules: importData.rules });

    if (importData.settings) {
      await browser.storage.local.set({ settings: importData.settings });
      await loadSettings();
    }

    await loadRules();
  } catch {
    alert("Failed to import: invalid JSON file.");
  }

  importFile.value = "";
});

// --- Rules ---

async function loadRules() {
  const storage = getStorage();
  const data = await storage.get("rules");
  allRules = data.rules || [];
  filterAndRenderRules();
}

function filterAndRenderRules() {
  const query = rulesSearch.value.toLowerCase().trim();
  const filtered = query
    ? allRules.filter((r) => r.pattern.toLowerCase().includes(query) || getContainerName(r.cookieStoreId).toLowerCase().includes(query))
    : allRules;
  renderRules(filtered);
  rulesEmpty.hidden = allRules.length > 0;
}

rulesSearch.addEventListener("input", filterAndRenderRules);

let draggedItem = null;
let draggedIndex = -1;

function renderRules(rules) {
  rulesList.innerHTML = "";
  rules.forEach((rule, index) => {
    const li = document.createElement("li");
    li.className = "rule-item";
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

    // Drag events
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
      const [moved] = allRules.splice(draggedIndex, 1);
      allRules.splice(targetIndex, 0, moved);
      await saveRules(allRules);
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
  patternInput.scrollIntoView({ behavior: "smooth", block: "center" });
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
  allRules = rules;
  const storage = getStorage();
  await storage.set({ rules });
  filterAndRenderRules();
}

async function deleteRule(id) {
  const rules = allRules.filter((r) => r.id !== id);
  if (editingRuleId === id) cancelEdit();
  await saveRules(rules);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const pattern = patternInput.value.trim();
  const matchType = matchTypeSelect.value;
  const cookieStoreId = containerSelect.value;
  if (!pattern || !cookieStoreId) return;

  if (editingRuleId) {
    const rule = allRules.find((r) => r.id === editingRuleId);
    if (rule) {
      rule.pattern = pattern;
      rule.matchType = matchType;
      rule.cookieStoreId = cookieStoreId;
    }
    cancelEdit();
  } else {
    allRules.push({ id: crypto.randomUUID(), pattern, matchType, cookieStoreId });
    patternInput.value = "";
  }

  await saveRules(allRules);
});

cancelBtn.addEventListener("click", cancelEdit);
matchTypeSelect.addEventListener("change", updateMatchTypeHints);

// --- Icon select with emoji ---
function populateIconSelect() {
  containerIconSelect.innerHTML = "";
  for (const [value, emoji] of Object.entries(CONTAINER_ICONS)) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = `${emoji} ${value}`;
    containerIconSelect.appendChild(opt);
  }
}

// --- Init ---
updateMatchTypeHints();
populateIconSelect();
(async () => {
  await loadContainers();
  renderContainers();
  await loadSettings();
  await loadRules();
})();
