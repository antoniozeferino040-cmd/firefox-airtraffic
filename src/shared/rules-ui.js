// Shared rules UI: rendering, drag & drop, edit/cancel/delete, form submit.
// Expects DOM elements and callbacks to be set up via initRulesUI().

let _rulesState = {
  editingRuleId: null,
  allRules: [],
  draggedItem: null,
  draggedIndex: -1,
  // DOM refs (set by initRulesUI)
  rulesList: null,
  patternInput: null,
  matchTypeSelect: null,
  containerSelect: null,
  submitBtn: null,
  cancelBtn: null,
  matchHint: null,
  form: null,
  // Optional callbacks
  onRulesChanged: null,
};

function initRulesUI(opts) {
  Object.assign(_rulesState, opts);

  _rulesState.matchTypeSelect.addEventListener("change", updateMatchHints);
  _rulesState.cancelBtn.addEventListener("click", cancelRuleEdit);

  _rulesState.form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pattern = _rulesState.patternInput.value.trim();
    const matchType = _rulesState.matchTypeSelect.value;
    const cookieStoreId = _rulesState.containerSelect.value;
    if (!pattern || !cookieStoreId) return;

    if (_rulesState.editingRuleId) {
      const rule = _rulesState.allRules.find((r) => r.id === _rulesState.editingRuleId);
      if (rule) {
        rule.pattern = pattern;
        rule.matchType = matchType;
        rule.cookieStoreId = cookieStoreId;
      }
      cancelRuleEdit();
    } else {
      _rulesState.allRules.push({ id: crypto.randomUUID(), pattern, matchType, cookieStoreId });
      _rulesState.patternInput.value = "";
    }

    await saveRulesToStorage(_rulesState.allRules);
    renderRulesList(_rulesState.allRules);
    if (_rulesState.onRulesChanged) _rulesState.onRulesChanged();
  });

  updateMatchHints();
}

function updateMatchHints() {
  const config = MATCH_TYPE_CONFIG[_rulesState.matchTypeSelect.value];
  _rulesState.patternInput.placeholder = config.placeholder;
  _rulesState.matchHint.textContent = config.hint;
}

function startRuleEdit(rule) {
  _rulesState.editingRuleId = rule.id;
  _rulesState.patternInput.value = rule.pattern;
  _rulesState.matchTypeSelect.value = rule.matchType;
  _rulesState.containerSelect.value = rule.cookieStoreId;
  _rulesState.submitBtn.textContent = "Save";
  _rulesState.cancelBtn.hidden = false;
  updateMatchHints();
  _rulesState.patternInput.focus();
  _rulesState.patternInput.scrollIntoView?.({ behavior: "smooth", block: "center" });
}

function cancelRuleEdit() {
  _rulesState.editingRuleId = null;
  _rulesState.patternInput.value = "";
  _rulesState.matchTypeSelect.value = "domain";
  _rulesState.containerSelect.value = "";
  _rulesState.submitBtn.textContent = "Add Rule";
  _rulesState.cancelBtn.hidden = true;
  updateMatchHints();
}

async function deleteRuleById(id) {
  _rulesState.allRules = _rulesState.allRules.filter((r) => r.id !== id);
  if (_rulesState.editingRuleId === id) cancelRuleEdit();
  await saveRulesToStorage(_rulesState.allRules);
  renderRulesList(_rulesState.allRules);
  if (_rulesState.onRulesChanged) _rulesState.onRulesChanged();
}

function setRules(rules) {
  _rulesState.allRules = rules;
}

function getRules() {
  return _rulesState.allRules;
}

function renderRulesList(rules) {
  const list = _rulesState.rulesList;
  list.innerHTML = "";

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
    editBtn.addEventListener("click", () => startRuleEdit(rule));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "\u00d7";
    deleteBtn.title = "Delete";
    deleteBtn.addEventListener("click", () => deleteRuleById(rule.id));

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(handle);
    li.appendChild(info);
    li.appendChild(badge);
    li.appendChild(actions);

    // Drag & drop
    li.addEventListener("dragstart", (e) => {
      _rulesState.draggedItem = li;
      _rulesState.draggedIndex = index;
      li.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });

    li.addEventListener("dragend", () => {
      li.classList.remove("dragging");
      list.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over"));
      _rulesState.draggedItem = null;
    });

    li.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (_rulesState.draggedItem && _rulesState.draggedItem !== li) li.classList.add("drag-over");
    });

    li.addEventListener("dragleave", () => li.classList.remove("drag-over"));

    li.addEventListener("drop", async (e) => {
      e.preventDefault();
      li.classList.remove("drag-over");
      const targetIndex = parseInt(li.dataset.index);
      if (_rulesState.draggedIndex === targetIndex) return;
      const [moved] = _rulesState.allRules.splice(_rulesState.draggedIndex, 1);
      _rulesState.allRules.splice(targetIndex, 0, moved);
      await saveRulesToStorage(_rulesState.allRules);
      renderRulesList(_rulesState.allRules);
      if (_rulesState.onRulesChanged) _rulesState.onRulesChanged();
    });

    list.appendChild(li);
  });
}
