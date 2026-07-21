const state = {
  editor: null,
  activeView: "overview",
  dashboard: null,
  inventory: [],
  imports: [],
  preview: null,
  quotes: [],
  products: [],
  loaded: new Set(),
};

const loginPanel = document.querySelector("#staff-login");
const loginForm = document.querySelector("#staff-login-form");
const loginMessage = document.querySelector("#staff-login-message");
const workspace = document.querySelector("#workspace");
const sidebar = document.querySelector("#workspace-sidebar");
const sidebarToggle = document.querySelector("#sidebar-toggle");
const workspaceTitle = document.querySelector("#workspace-title");
const workspaceEyebrow = document.querySelector("#workspace-eyebrow");
const toast = document.querySelector("#workspace-toast");
const quoteDetailDialog = document.querySelector("#quote-detail-dialog");
const quoteDetailContent = document.querySelector("#quote-detail-content");

const VIEW_TITLES = {
  overview: ["Overview", "Operations workspace"],
  inventory: ["Inventory", "Private stock data"],
  imports: ["Inventory imports", "Validated monthly workflow"],
  quotes: ["Quotations", "Saved customer requests"],
  products: ["Products", "Catalogue management"],
};

const ROLE_LABELS = {
  administrator: "Administrator",
  product_editor: "Product editor",
  sales: "Sales",
  inventory_manager: "Inventory manager",
  viewer: "Viewer",
};

const VIEW_PERMISSIONS = {
  administrator: new Set(["overview", "inventory", "imports", "quotes", "products"]),
  product_editor: new Set(["overview", "products"]),
  sales: new Set(["overview", "quotes"]),
  inventory_manager: new Set(["overview", "inventory", "imports"]),
  viewer: new Set(["overview", "inventory"]),
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.hidden = true; }, 4200);
}

function formMessage(element, message = "", error = false) {
  element.textContent = message;
  element.classList.toggle("error", error);
}

async function readApi(response) {
  let body = {};
  try { body = await response.json(); } catch { body = {}; }
  if (!response.ok) {
    const error = new Error(body.error || "The request could not be completed.");
    error.code = body.code;
    error.status = response.status;
    throw error;
  }
  return body;
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {}),
    },
  });
  if (response.status === 401) {
    showLogin();
    throw new Error("Your session expired. Sign in again.");
  }
  return readApi(response);
}

function formatDate(value, withTime = false) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(date);
}

function reportLabel(month, year) {
  if (!month || !year) return "No valid report";
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}

function titleCase(value) {
  return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusBadge(value) {
  return `<span class="status-badge ${escapeHtml(value)}">${escapeHtml(titleCase(value))}</span>`;
}

function showLogin() {
  workspace.hidden = true;
  loginPanel.hidden = false;
  setTimeout(() => loginForm.elements.email.focus(), 30);
  refreshIcons();
}

function configureRole() {
  const role = state.editor.platformRole || "viewer";
  const allowed = VIEW_PERMISSIONS[role] || VIEW_PERMISSIONS.viewer;
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.hidden = !allowed.has(button.dataset.view);
  });
  if (!allowed.has(state.activeView)) state.activeView = [...allowed][0];
}

function showWorkspace(editor) {
  state.editor = editor;
  loginPanel.hidden = true;
  workspace.hidden = false;
  document.querySelector("#staff-name").textContent = editor.displayName || editor.email;
  document.querySelector("#staff-role").textContent = ROLE_LABELS[editor.platformRole] || "Staff";
  document.querySelector("#staff-avatar").textContent = (editor.displayName || editor.email).slice(0, 1).toUpperCase();
  configureRole();
  openView(state.activeView, true);
  refreshIcons();
}

async function checkSession() {
  try {
    const body = await api("/api/admin/session");
    showWorkspace(body.editor);
  } catch {
    showLogin();
  }
}

async function submitLogin(event) {
  event.preventDefault();
  formMessage(loginMessage);
  const button = loginForm.querySelector("button[type=submit]");
  button.disabled = true;
  const form = new FormData(loginForm);
  try {
    const body = await readApi(await fetch("/api/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
        deviceName: form.get("deviceName"),
      }),
    }));
    const session = await api("/api/admin/session");
    showWorkspace(session.editor || body.editor);
  } catch (error) {
    formMessage(loginMessage, error.message, true);
  } finally {
    button.disabled = false;
  }
}

async function signOut() {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
  }).catch(() => {});
  state.editor = null;
  state.loaded.clear();
  showLogin();
}

async function openView(view, force = false) {
  const allowed = VIEW_PERMISSIONS[state.editor?.platformRole || "viewer"] || VIEW_PERMISSIONS.viewer;
  if (!allowed.has(view)) return;
  state.activeView = view;
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  document.querySelectorAll("[data-panel]").forEach((panel) => {
    const active = panel.dataset.panel === view;
    panel.classList.toggle("active", active);
    panel.hidden = !active;
  });
  [workspaceTitle.textContent, workspaceEyebrow.textContent] = VIEW_TITLES[view];
  sidebar.classList.remove("open");
  sidebarToggle.setAttribute("aria-expanded", "false");
  if (force || !state.loaded.has(view)) {
    try {
      await loadView(view);
      state.loaded.add(view);
    } catch (error) {
      showToast(error.message);
    }
  }
  document.querySelector("#workspace-content").focus({ preventScroll: true });
  refreshIcons();
}

async function loadView(view) {
  if (view === "overview") return loadOverview();
  if (view === "inventory") return loadInventory();
  if (view === "imports") return loadImports();
  if (view === "quotes") return loadQuotes();
  if (view === "products") return loadProducts();
}

function metricCard(label, value, detail, icon) {
  return `<article class="metric-card"><div><p>${escapeHtml(label)}</p><strong>${escapeHtml(value)}</strong><small>${escapeHtml(detail)}</small></div><span><i data-lucide="${icon}"></i></span></article>`;
}

async function loadOverview() {
  const body = await api("/api/admin/dashboard");
  state.dashboard = body;
  document.querySelector("#overview-metrics").innerHTML = [
    metricCard("Published products", body.catalog.published, `${body.inventory.mapped} mapped / ${body.inventory.unmapped} unmapped`, "package-check"),
    metricCard("In-stock lines", body.inventory.inStock, `${body.inventory.lowStock} low / ${body.inventory.outOfStock} out of stock`, "boxes"),
    metricCard("New quotations", body.quotes.new, `${body.quotes.inProgress} in progress`, "files"),
    metricCard("Latest report", body.latestReport ? reportLabel(body.latestReport.month, body.latestReport.year) : "Not imported", body.latestReport ? formatDate(body.latestReport.appliedAt) : "Upload a validated workbook", "calendar-check"),
  ].join("");
  const reportPanel = document.querySelector("#latest-report-panel");
  reportPanel.innerHTML = body.latestReport
    ? `<div class="panel-heading"><div><p class="kicker">Inventory source</p><h3>Latest successful report</h3></div></div><div class="report-state ${body.latestReport.stale ? "report-warning" : ""}"><span><i data-lucide="${body.latestReport.stale ? "triangle-alert" : "shield-check"}"></i></span><div><strong>${escapeHtml(reportLabel(body.latestReport.month, body.latestReport.year))}</strong><small>${body.latestReport.stale ? "A newer monthly report may be expected" : "Applied successfully"}</small></div></div><div class="report-meta"><div><span>Source</span><strong>${escapeHtml(body.latestReport.source)}</strong></div><div><span>Updated</span><strong>${escapeHtml(formatDate(body.latestReport.appliedAt, true))}</strong></div><div><span>Imported by</span><strong>${escapeHtml(body.latestReport.importedBy)}</strong></div><div><span>Review items</span><strong>${escapeHtml(body.latestReport.unmatchedRows + body.latestReport.ambiguousRows + body.latestReport.invalidRows)}</strong></div></div>`
    : `<div class="panel-heading"><div><p class="kicker">Inventory source</p><h3>No successful report yet</h3></div></div><div class="empty-state"><i data-lucide="database"></i><p>Public products remain on Contact for availability until a reviewed import is applied.</p><button class="primary-button" type="button" data-open-view="imports">Open imports</button></div>`;
  renderHistoryChart(body.importHistory);
  document.querySelector("#overview-quotes").innerHTML = body.recentQuotes.length
    ? body.recentQuotes.map((quote) => `<tr><td><strong>${escapeHtml(quote.reference)}</strong></td><td><strong>${escapeHtml(quote.companyName || quote.customerName)}</strong><small>${escapeHtml(quote.customerName)}</small></td><td>${escapeHtml(quote.products || "General enquiry")}</td><td>${statusBadge(quote.status)}</td><td>${escapeHtml(formatDate(quote.createdAt))}</td></tr>`).join("")
    : `<tr class="empty-row"><td colspan="5">No quotation requests have been submitted.</td></tr>`;
  const navCount = document.querySelector("#quote-nav-count");
  navCount.textContent = body.quotes.new;
  navCount.hidden = !body.quotes.new;
  bindOpenViewButtons();
  refreshIcons();
}

function renderHistoryChart(history) {
  const chart = document.querySelector("#import-history-chart");
  if (!history.length) {
    chart.innerHTML = `<div class="empty-state">A chart will appear after the first successful import.</div>`;
    return;
  }
  const max = Math.max(...history.map((item) => item.mappedRows), 1);
  chart.innerHTML = history.map((item) => {
    const height = Math.max(4, Math.round((item.mappedRows / max) * 145));
    return `<div class="chart-column"><div style="height:${height}px" title="${escapeHtml(`${item.mappedRows} mapped products`)}"><span>${escapeHtml(item.mappedRows)}</span></div><small>${escapeHtml(`${item.month}/${String(item.year).slice(-2)}`)}</small></div>`;
  }).join("");
}

async function loadInventory() {
  const body = await api("/api/admin/inventory");
  state.inventory = body.inventory;
  renderInventory();
}

function filteredInventory() {
  const query = document.querySelector("#inventory-search").value.trim().toLowerCase();
  const status = document.querySelector("#inventory-status-filter").value;
  const mapping = document.querySelector("#inventory-mapping-filter").value;
  return state.inventory.filter((item) => {
    const haystack = [item.product, item.brand, item.category, item.internalId, item.sku, item.model, ...item.workbookCodes, ...item.workbookNames].join(" ").toLowerCase();
    return (!query || haystack.includes(query))
      && (status === "all" || item.publicAvailability === status)
      && (mapping === "all" || item.mappingStatus === mapping);
  });
}

function renderInventory() {
  const items = filteredInventory();
  document.querySelector("#inventory-result-count").textContent = `${items.length} products`;
  document.querySelector("#inventory-body").innerHTML = items.length
    ? items.map((item) => `<tr><td><div class="product-cell"><img src="${escapeHtml(item.image)}" alt="" loading="lazy" /><div><strong>${escapeHtml(item.product)}</strong><small>${escapeHtml(`${item.brand} / ${titleCase(item.category)}`)}</small></div></div></td><td><strong>${escapeHtml(item.internalId || "No internal ID")}</strong><small>SKU: ${escapeHtml(item.sku || "Not set")} | Model: ${escapeHtml(item.model || "Not set")}</small></td><td><strong>${escapeHtml(item.workbookNames.join("; ") || "Not linked")}</strong><small>${escapeHtml(item.workbookCodes.join(", ") || "No workbook code")}</small></td><td class="quantity-cell">${item.quantity === null ? "-" : escapeHtml(item.quantity)}</td><td>${statusBadge(item.publicAvailability)}<small>${item.overrideStatus === "active" ? `Override: ${escapeHtml(item.overrideReason || "documented")}` : escapeHtml(titleCase(item.dataStatus))}</small></td><td><strong>${escapeHtml(reportLabel(item.reportMonth, item.reportYear))}</strong><small>${escapeHtml(formatDate(item.updatedAt, true))}</small></td><td>${statusBadge(item.mappingStatus)}<small>${item.linkedRows ? `${item.linkedRows} linked row(s)` : "No linked row"}</small></td></tr>`).join("")
    : `<tr class="empty-row"><td colspan="7">No inventory products match these filters.</td></tr>`;
}

function initializeReportFields() {
  const month = document.querySelector("#report-month");
  if (!month.options.length) {
    month.innerHTML = Array.from({ length: 12 }, (_, index) => `<option value="${index + 1}">${new Intl.DateTimeFormat("en-GB", { month: "long" }).format(new Date(Date.UTC(2026, index, 1)))}</option>`).join("");
  }
  const now = new Date();
  month.value = String(now.getMonth() + 1);
  document.querySelector("#report-year").value = String(now.getFullYear());
}

async function loadImports() {
  initializeReportFields();
  const [imports, connectors] = await Promise.all([
    api("/api/admin/imports"),
    api("/api/admin/connectors"),
  ]);
  state.imports = imports.imports;
  renderImportHistory();
  renderConnector(connectors);
}

function renderConnector(body) {
  const connector = body.connectedWorkbook;
  document.querySelector("#connector-panel").innerHTML = `<div class="panel-heading"><div><p class="kicker">Update source</p><h3>Workbook connection</h3></div><i data-lucide="cloud-cog"></i></div><div class="connector-status ${connector.configured ? "configured" : ""}"><span><i data-lucide="${connector.configured ? "cloud-check" : "cloud-off"}"></i></span><div><strong>${connector.configured ? "Connected source configured" : "Manual upload active"}</strong><small>${connector.configured ? titleCase(connector.status) : "No automatic cloud source is configured"}</small></div></div><p class="connector-copy">A local attachment cannot update itself. Automatic checks become available only after a private cloud workbook URL and access token are configured on the server.</p>`;
  refreshIcons();
}

function renderImportHistory() {
  document.querySelector("#import-history-body").innerHTML = state.imports.length
    ? state.imports.map((item) => `<tr><td><strong>${escapeHtml(reportLabel(item.reportMonth, item.reportYear))}</strong><small>${escapeHtml(formatDate(item.appliedAt || item.createdAt, true))}</small></td><td><strong>${escapeHtml(item.fileName)}</strong><small>${escapeHtml(item.sourceName)}</small></td><td>${statusBadge(item.status)}</td><td>${escapeHtml(item.summary.totalRows)}</td><td>${escapeHtml(item.summary.mappedRows)}</td><td>${escapeHtml(item.summary.changedProducts)}</td><td>${escapeHtml(item.createdBy)}</td><td><div class="heading-actions"><button class="secondary-button" type="button" data-review-import="${escapeHtml(item.id)}">Review</button>${item.status === "applied" ? `<button class="secondary-button" type="button" data-rollback-import="${escapeHtml(item.id)}">Rollback</button>` : ""}</div></td></tr>`).join("")
    : `<tr class="empty-row"><td colspan="8">No inventory imports have been created.</td></tr>`;
  document.querySelectorAll("[data-review-import]").forEach((button) => button.addEventListener("click", () => openImportPreview(button.dataset.reviewImport)));
  document.querySelectorAll("[data-rollback-import]").forEach((button) => button.addEventListener("click", () => rollbackImport(button.dataset.rollbackImport)));
}

async function submitImport(event) {
  event.preventDefault();
  const button = document.querySelector("#preview-import-button");
  const message = document.querySelector("#import-message");
  formMessage(message, "Uploading and validating workbook...");
  button.disabled = true;
  try {
    const body = await api("/api/admin/imports/preview", {
      method: "POST",
      body: new FormData(event.currentTarget),
    });
    state.preview = body;
    renderPreview();
    document.querySelector("#import-preview").scrollIntoView({ behavior: "smooth", block: "start" });
    formMessage(message, "Workbook validated. Review mappings before applying.");
    await refreshImportsOnly();
  } catch (error) {
    formMessage(message, error.message, true);
  } finally {
    button.disabled = false;
  }
}

async function refreshImportsOnly() {
  const body = await api("/api/admin/imports");
  state.imports = body.imports;
  renderImportHistory();
}

async function openImportPreview(id) {
  state.preview = await api(`/api/admin/imports/${encodeURIComponent(id)}`);
  renderPreview();
  document.querySelector("#import-preview").scrollIntoView({ behavior: "smooth", block: "start" });
}

function previewFilteredRows() {
  if (!state.preview) return [];
  const query = document.querySelector("#preview-search").value.trim().toLowerCase();
  const filter = document.querySelector("#preview-filter").value;
  return state.preview.rows.filter((row) => {
    const matchesQuery = !query || `${row.workbookName} ${row.workbookCode} ${row.productName || ""}`.toLowerCase().includes(query);
    const matchesFilter = filter === "all"
      || (filter === "invalid" ? row.validationStatus === "invalid" : null)
      || (filter === "warning" ? row.warnings.length > 0 : null)
      || row.mappingStatus === filter;
    return matchesQuery && matchesFilter;
  });
}

function warningLabel(warning) {
  if (warning.startsWith("duplicate_row")) return "Duplicate row";
  return titleCase(warning);
}

function renderPreview() {
  const panel = document.querySelector("#import-preview");
  if (!state.preview) { panel.hidden = true; return; }
  panel.hidden = false;
  const record = state.preview.import;
  document.querySelector("#preview-errors").href = `/api/admin/imports/${encodeURIComponent(record.id)}/errors`;
  document.querySelector("#preview-title").textContent = `${reportLabel(record.reportMonth, record.reportYear)} preview`;
  const summary = record.summary;
  const metrics = [
    [summary.totalRows, "Workbook rows"], [summary.validRows, "Valid rows"],
    [summary.mappedRows, "Mapped rows"], [summary.unmatchedRows, "Unmatched"],
    [summary.ambiguousRows, "Ambiguous"], [summary.invalidRows, "Invalid"],
    [summary.duplicateCodes, "Duplicate codes"], [summary.missingCodes, "Missing codes"],
    [summary.invalidQuantities, "Invalid quantities"], [summary.changedProducts, "Changed products"],
    [summary.unchangedProducts, "Unchanged products"], [summary.missingProducts, "Missing from report"],
  ];
  document.querySelector("#preview-metrics").innerHTML = metrics.map(([value, label]) => `<div class="preview-metric"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`).join("");
  const canApply = record.status === "preview" && summary.mappedRows > 0 && summary.ambiguousRows === 0;
  const confirmButton = document.querySelector("#confirm-import");
  confirmButton.hidden = record.status !== "preview";
  confirmButton.disabled = !canApply;
  document.querySelector("#cancel-import").hidden = record.status !== "preview";
  document.querySelector("#preview-notice").textContent = record.status === "preview"
    ? `${summary.mappedRows} mapped rows will update stock. Unmatched and ignored rows will not change the catalogue. Ambiguous rows must be reviewed.`
    : `This import is ${titleCase(record.status)}. Its stored preview remains available for audit.`;
  renderPreviewRows();
  refreshIcons();
}

function renderPreviewRows() {
  const rows = previewFilteredRows();
  const editable = state.preview?.import.status === "preview";
  document.querySelector("#preview-result-count").textContent = `${rows.length} rows`;
  const options = state.preview.products.map((product) => `<option value="${escapeHtml(product.id)}">${escapeHtml(`${product.name} | ${product.brand}${product.model ? ` | ${product.model}` : ""}`)}</option>`).join("");
  document.querySelector("#preview-body").innerHTML = rows.length
    ? rows.map((row) => `<tr><td>${escapeHtml(row.rowNumber)}</td><td><strong>${escapeHtml(row.workbookName)}</strong><small>${statusBadge(row.mappingStatus)}</small></td><td>${escapeHtml(row.workbookCode || "Missing")}</td><td class="quantity-cell ${row.quantity === null ? "row-error" : ""}">${row.quantity === null ? "Invalid" : escapeHtml(row.quantity)}</td><td><select data-map-row="${escapeHtml(row.rowNumber)}" ${!editable || row.validationStatus === "invalid" ? "disabled" : ""}><option value="">Unmatched / choose product</option><option value="__ignore" ${row.mappingStatus === "ignored" ? "selected" : ""}>Ignore this row</option>${options}</select></td><td><div class="warning-list">${row.warnings.length ? row.warnings.map((warning) => `<span class="warning-chip">${escapeHtml(warningLabel(warning))}</span>`).join("") : "<small>No warnings</small>"}</div></td></tr>`).join("")
    : `<tr class="empty-row"><td colspan="6">No workbook rows match this filter.</td></tr>`;
  document.querySelectorAll("[data-map-row]").forEach((select) => {
    const row = state.preview.rows.find((item) => item.rowNumber === Number(select.dataset.mapRow));
    if (row?.productId) select.value = row.productId;
    select.addEventListener("change", () => updateMapping(select));
  });
}

async function updateMapping(select) {
  const scroll = document.querySelector(".preview-table-scroll");
  const scrollTop = scroll.scrollTop;
  const scrollLeft = scroll.scrollLeft;
  select.disabled = true;
  const value = select.value;
  try {
    state.preview = await api(`/api/admin/imports/${encodeURIComponent(state.preview.import.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rowNumber: Number(select.dataset.mapRow),
        action: value === "__ignore" ? "ignore" : value ? "map" : "clear",
        productId: value.startsWith("__") ? "" : value,
      }),
    });
    renderPreview();
    scroll.scrollTop = scrollTop;
    scroll.scrollLeft = scrollLeft;
  } catch (error) {
    showToast(error.message);
    select.disabled = false;
  }
}

async function confirmImport() {
  if (!state.preview || !window.confirm("Apply this reviewed inventory preview to the public catalogue?")) return;
  const button = document.querySelector("#confirm-import");
  button.disabled = true;
  try {
    state.preview = await api(`/api/admin/imports/${encodeURIComponent(state.preview.import.id)}/confirm`, { method: "POST" });
    renderPreview();
    state.loaded.delete("overview");
    state.loaded.delete("inventory");
    await refreshImportsOnly();
    showToast("Inventory applied successfully.");
  } catch (error) {
    showToast(error.message);
  } finally {
    button.disabled = false;
  }
}

async function cancelImport() {
  if (!state.preview) return;
  try {
    await api(`/api/admin/imports/${encodeURIComponent(state.preview.import.id)}`, { method: "DELETE" });
    state.preview = null;
    renderPreview();
    await refreshImportsOnly();
    showToast("Import preview cancelled.");
  } catch (error) { showToast(error.message); }
}

async function rollbackImport(id) {
  if (!window.confirm("Restore the inventory snapshot from before this import?")) return;
  try {
    await api(`/api/admin/imports/${encodeURIComponent(id)}/rollback`, { method: "POST" });
    state.preview = null;
    state.loaded.delete("overview");
    state.loaded.delete("inventory");
    await refreshImportsOnly();
    renderPreview();
    showToast("Inventory rollback completed.");
  } catch (error) { showToast(error.message); }
}

async function loadQuotes() {
  const body = await api("/api/admin/quotes");
  state.quotes = body.quotes;
  renderQuotes();
}

function filteredQuotes() {
  const query = document.querySelector("#quote-search").value.trim().toLowerCase();
  const status = document.querySelector("#quote-status-filter").value;
  return state.quotes.filter((quote) => {
    const haystack = [quote.reference, quote.customerName, quote.companyName, quote.email, quote.phone, quote.products, quote.message].join(" ").toLowerCase();
    return (!query || haystack.includes(query)) && (status === "all" || quote.status === status);
  });
}

function renderQuotes() {
  const quotes = filteredQuotes();
  document.querySelector("#quote-result-count").textContent = `${quotes.length} requests`;
  document.querySelector("#quotes-body").innerHTML = quotes.length
    ? quotes.map((quote) => `<tr><td><div class="reference-cell"><div><strong>${escapeHtml(quote.reference)}</strong><small>${escapeHtml(titleCase(quote.enquiryType))}</small></div><button class="icon-button" type="button" data-view-quote="${escapeHtml(quote.id)}" aria-label="View ${escapeHtml(quote.reference)}" title="View details"><i data-lucide="eye"></i></button></div></td><td><strong>${escapeHtml(quote.companyName || quote.customerName)}</strong><small>${escapeHtml(quote.customerName)}</small></td><td><div class="contact-links">${quote.phone ? `<a href="tel:${escapeHtml(quote.phone)}">${escapeHtml(quote.phone)}</a>` : ""}${quote.email ? `<a href="mailto:${escapeHtml(quote.email)}">${escapeHtml(quote.email)}</a>` : ""}</div></td><td><strong>${escapeHtml(quote.products || "General enquiry")}</strong><small>${quote.totalQuantity ? `Quantity: ${escapeHtml(quote.totalQuantity)}` : "Quantity not specified"}</small></td><td><p class="quote-message">${escapeHtml(quote.message || "No additional message")}</p></td><td><select class="quote-status-select" data-quote-status="${escapeHtml(quote.id)}">${["new", "under_review", "information_required", "preparing_quotation", "quoted", "accepted", "rejected", "completed", "archived"].map((status) => `<option value="${status}" ${status === quote.status ? "selected" : ""}>${titleCase(status)}</option>`).join("")}</select></td><td>${escapeHtml(formatDate(quote.createdAt, true))}</td></tr>`).join("")
    : `<tr class="empty-row"><td colspan="7">No quotation requests match these filters.</td></tr>`;
  document.querySelectorAll("[data-quote-status]").forEach((select) => select.addEventListener("change", () => updateQuoteStatus(select)));
  document.querySelectorAll("[data-view-quote]").forEach((button) => button.addEventListener("click", () => openQuoteDetails(button.dataset.viewQuote)));
  refreshIcons();
}

async function openQuoteDetails(id) {
  try {
    const body = await api(`/api/admin/quotes/${encodeURIComponent(id)}`);
    const quote = body.quote;
    quoteDetailDialog.querySelector("#quote-detail-title").textContent = quote.reference;
    quoteDetailContent.innerHTML = `
      <section class="quote-detail-summary">
        <div><span>Customer</span><strong>${escapeHtml(quote.companyName || quote.customerName)}</strong><small>${escapeHtml(quote.customerName)}</small></div>
        <div><span>Status</span><strong>${statusBadge(quote.status)}</strong></div>
        <div><span>Contact</span><strong>${escapeHtml(quote.phone || quote.email || "Not provided")}</strong><small>${escapeHtml(titleCase(quote.preferredContact))}</small></div>
        <div><span>Submitted</span><strong>${escapeHtml(formatDate(quote.createdAt, true))}</strong><small>${escapeHtml(String(quote.language || "az").toUpperCase())}</small></div>
        <div><span>Project</span><strong>${escapeHtml(quote.projectLocation || "Not provided")}</strong><small>${escapeHtml(quote.timeline || "Timeline not provided")}</small></div>
        <div><span>Request</span><strong>${escapeHtml(quote.message || "No additional message")}</strong></div>
      </section>
      <section class="quote-detail-products"><div class="panel-heading"><div><p class="kicker">Requested equipment</p><h3>Products and stock context</h3></div></div>${body.items.map((item) => `<div class="quote-product-record"><div><strong>${escapeHtml(item.productName)}</strong><small>${escapeHtml(item.requirements || "No item-specific requirements")}</small></div><div><strong>${item.quantity ?? "-"}</strong><small>At request: ${escapeHtml(titleCase(item.inventoryStatusAtSubmission))}</small><small>Current: ${escapeHtml(titleCase(item.currentInventoryStatus))}</small></div></div>`).join("")}</section>
      <section class="quote-detail-events"><div class="panel-heading"><div><p class="kicker">Audit trail</p><h3>Activity history</h3></div></div>${body.events.map((event) => `<div class="quote-event-record"><div><strong>${escapeHtml(titleCase(event.eventType))}</strong><p>${escapeHtml(event.note || `${titleCase(event.fromStatus || "start")} to ${titleCase(event.toStatus || "new")}`)}</p></div><small>${escapeHtml(formatDate(event.createdAt, true))}<br />${escapeHtml(event.actorEmail)}</small></div>`).join("")}</section>`;
    quoteDetailDialog.showModal();
    refreshIcons();
  } catch (error) {
    showToast(error.message);
  }
}

async function updateQuoteStatus(select) {
  select.disabled = true;
  try {
    const result = await api(`/api/admin/quotes/${encodeURIComponent(select.dataset.quoteStatus)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: select.value }),
    });
    const quote = state.quotes.find((item) => item.id === result.id);
    if (quote) quote.status = result.status;
    state.loaded.delete("overview");
    showToast(`Quotation moved to ${titleCase(result.status)}.`);
  } catch (error) {
    showToast(error.message);
    await loadQuotes();
  } finally { select.disabled = false; }
}

async function loadProducts() {
  const body = await api("/api/admin/products");
  state.products = body.products;
  renderProducts();
}

function renderProducts() {
  const query = document.querySelector("#product-admin-search").value.trim().toLowerCase();
  const products = state.products.filter((product) => [product.name, product.brand, product.category, product.model, product.sku].join(" ").toLowerCase().includes(query));
  document.querySelector("#product-admin-count").textContent = `${products.length} products`;
  document.querySelector("#product-admin-grid").innerHTML = products.length
    ? products.map((product) => `<article class="product-admin-item"><img src="${escapeHtml(product.image)}" alt="" loading="lazy" /><div><p>${escapeHtml(`${titleCase(product.category)} / ${product.brand}`)}</p><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.model || product.sku || "Identifiers not set")}</p><div class="item-actions"><a class="secondary-button" href="/?product=${encodeURIComponent(product.slug || product.id)}" target="_blank" rel="noopener"><i data-lucide="eye"></i>View</a><a class="primary-button" href="/?edit=${encodeURIComponent(product.id)}"><i data-lucide="pencil"></i>Edit</a></div></div></article>`).join("")
    : `<div class="empty-state">No products match this search.</div>`;
  refreshIcons();
}

function bindOpenViewButtons() {
  document.querySelectorAll("[data-open-view]").forEach((button) => {
    button.onclick = () => openView(button.dataset.openView);
  });
}

document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => openView(button.dataset.view)));
document.querySelectorAll("[data-refresh]").forEach((button) => button.addEventListener("click", async () => {
  button.disabled = true;
  try { await openView(button.dataset.refresh, true); showToast("Data refreshed."); }
  finally { button.disabled = false; }
}));
document.querySelector("#staff-sign-out").addEventListener("click", signOut);
loginForm.addEventListener("submit", submitLogin);
sidebarToggle.addEventListener("click", () => {
  const open = sidebar.classList.toggle("open");
  sidebarToggle.setAttribute("aria-expanded", String(open));
});
document.querySelector("#inventory-search").addEventListener("input", renderInventory);
document.querySelector("#inventory-status-filter").addEventListener("change", renderInventory);
document.querySelector("#inventory-mapping-filter").addEventListener("change", renderInventory);
document.querySelector("#import-form").addEventListener("submit", submitImport);
document.querySelector("#inventory-workbook").addEventListener("change", (event) => {
  document.querySelector("#workbook-file-label").textContent = event.target.files[0]?.name || "Choose .xlsx workbook";
});
document.querySelector("#preview-search").addEventListener("input", renderPreviewRows);
document.querySelector("#preview-filter").addEventListener("change", renderPreviewRows);
document.querySelector("#confirm-import").addEventListener("click", confirmImport);
document.querySelector("#cancel-import").addEventListener("click", cancelImport);
document.querySelector("#quote-search").addEventListener("input", renderQuotes);
document.querySelector("#quote-status-filter").addEventListener("change", renderQuotes);
document.querySelector("#quote-detail-close").addEventListener("click", () => quoteDetailDialog.close());
document.querySelector("#product-admin-search").addEventListener("input", renderProducts);

refreshIcons();
checkSession();
