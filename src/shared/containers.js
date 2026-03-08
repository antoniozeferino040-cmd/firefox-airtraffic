let airtrafficContainers = [];

async function loadContainerList() {
  airtrafficContainers = await browser.contextualIdentities.query({});
  return airtrafficContainers;
}

function getContainerName(cookieStoreId) {
  const c = airtrafficContainers.find((c) => c.cookieStoreId === cookieStoreId);
  return c ? c.name : cookieStoreId;
}

function getContainerColor(cookieStoreId) {
  const c = airtrafficContainers.find((c) => c.cookieStoreId === cookieStoreId);
  if (!c) return "#555";
  return CONTAINER_COLORS[c.color] || "#555";
}

function populateContainerSelect(selectEl, placeholder) {
  selectEl.innerHTML = `<option value="">${placeholder || "Select container..."}</option>`;
  for (const c of airtrafficContainers) {
    const icon = CONTAINER_ICONS[c.icon] || "";
    const opt = document.createElement("option");
    opt.value = c.cookieStoreId;
    opt.textContent = `${icon} ${c.name}`;
    selectEl.appendChild(opt);
  }
}
