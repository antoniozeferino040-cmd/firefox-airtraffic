import { CONTAINER_COLORS, CONTAINER_ICONS } from "./constants";

let airtrafficContainers: ContextualIdentity[] = [];

export async function loadContainerList(): Promise<ContextualIdentity[]> {
  airtrafficContainers = await browser.contextualIdentities.query({});
  return airtrafficContainers;
}

export function getContainers(): ContextualIdentity[] {
  return airtrafficContainers;
}

export function getContainerName(cookieStoreId: string): string {
  const c = airtrafficContainers.find((c) => c.cookieStoreId === cookieStoreId);
  return c ? c.name : cookieStoreId;
}

export function getContainerColor(cookieStoreId: string): string {
  const c = airtrafficContainers.find((c) => c.cookieStoreId === cookieStoreId);
  if (!c) return "#555";
  return CONTAINER_COLORS[c.color] || "#555";
}

export function populateContainerSelect(selectEl: HTMLSelectElement, placeholder?: string): void {
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = placeholder || "Select container...";
  selectEl.replaceChildren(defaultOpt);
  for (const c of airtrafficContainers) {
    const icon = CONTAINER_ICONS[c.icon] || "";
    const opt = document.createElement("option");
    opt.value = c.cookieStoreId;
    opt.textContent = `${icon} ${c.name}`;
    selectEl.appendChild(opt);
  }
}
