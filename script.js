const phonePrimary = "+994505728966";
const whatsappBase = "https://wa.me/994505728966";
const salesEmail = "aztexnogaz@gmail.com";
const i18n = window.AzTexnoI18n;
const t = (key, variables = {}) => i18n?.t(key, variables) || key.replace(/\{(\w+)\}/g, (match, name) => variables[name] ?? match);

const categoryTranslationKeys = {
  metering: "Metering",
  regulators: "Regulators",
  conversion: "Conversion",
  valves: "Valves",
  hvac: "HVAC",
  modems: "Modems",
  accessories: "Accessories",
  cabinets: "Cabinets",
};

function categoryLabel(category) {
  return t(categoryTranslationKeys[category] || category);
}

function localizedProduct(product) {
  const translation = product.translations?.[i18n?.language];
  return translation ? { ...product, ...translation } : product;
}

let products = [];
let catalogMetadata = {
  productCount: 0,
  brandCount: 0,
  trackedProductCount: 0,
  latestReport: null,
};

const grid = document.querySelector("#product-grid");
const count = document.querySelector("#product-count");
const searchInput = document.querySelector("#product-search");
const filterButtons = document.querySelectorAll("[data-filter]");
const availabilityFilter = document.querySelector("#availability-filter");
const brandFilter = document.querySelector("#brand-filter");
const sortSelect = document.querySelector("#catalog-sort");
const viewButtons = document.querySelectorAll("[data-catalog-view]");
const categoryGrid = document.querySelector("#category-grid");
const heroProductCount = document.querySelector("#hero-product-count");
const heroReportDate = document.querySelector("#hero-report-date");
const catalogReportNote = document.querySelector("#catalog-report-note");
const quoteProduct = document.querySelector("#quote-product");
const quoteQuantity = document.querySelector("#quote-quantity");
const quoteAddProduct = document.querySelector("#quote-add-product");
const quoteItemsList = document.querySelector("#quote-items-list");
const quoteMessage = document.querySelector("#quote-message");
const quoteForm = document.querySelector("#quote-form");
const quoteFormStatus = document.querySelector("#quote-form-status");
const modal = document.querySelector("#product-modal");
const modalImage = document.querySelector("#modal-image");
const modalCategory = document.querySelector("#modal-category");
const modalTitle = document.querySelector("#modal-title");
const modalDescription = document.querySelector("#modal-description");
const modalSpecs = document.querySelector("#modal-specs");
const modalModel = document.querySelector("#modal-model");
const modalAvailability = document.querySelector("#modal-availability");
const modalReportDate = document.querySelector("#modal-report-date");
const modalQuote = document.querySelector("#modal-quote");
const modalWhatsapp = document.querySelector("#modal-whatsapp");
const modalShare = document.querySelector("#modal-share");
const modalClose = document.querySelector(".modal-close");
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector("#main-menu");
const staffAccess = document.querySelector("#staff-access");
const editorBar = document.querySelector("#editor-bar");
const editorEmail = document.querySelector("#editor-email");
const editorSignOut = document.querySelector("#editor-sign-out");
const addProductButton = document.querySelector("#add-product-button");
const manageEditorsButton = document.querySelector("#manage-editors-button");
const productEditorModal = document.querySelector("#product-editor-modal");
const productEditorForm = document.querySelector("#product-editor-form");
const productEditorTitle = document.querySelector("#product-editor-title");
const productEditorMessage = document.querySelector("#product-editor-message");
const productEditorSave = document.querySelector("#product-editor-save");
const editorImage = document.querySelector("#editor-image");
const editorImagePreview = document.querySelector("#editor-image-preview");
const imageDropZone = document.querySelector("#image-drop-zone");
const imageDropPrompt = document.querySelector("#image-drop-prompt");
const editorLanguageTabs = document.querySelector("#editor-language-tabs");
const editorLanguageButtons = [...editorLanguageTabs.querySelectorAll("[data-editor-language]")];
const editorResetTranslations = document.querySelector("#editor-reset-translations");
const editorLoginModal = document.querySelector("#editor-login-modal");
const editorLoginForm = document.querySelector("#editor-login-form");
const editorLoginMessage = document.querySelector("#editor-login-message");
const editorLoginSubmit = document.querySelector("#editor-login-submit");
const accessModal = document.querySelector("#access-modal");
const addEditorForm = document.querySelector("#add-editor-form");
const accessMessage = document.querySelector("#access-message");
const editorList = document.querySelector("#editor-list");
const confirmModal = document.querySelector("#confirm-modal");
const confirmMessage = document.querySelector("#confirm-message");
const confirmCancel = document.querySelector("#confirm-cancel");
const confirmDelete = document.querySelector("#confirm-delete");
const editorToast = document.querySelector("#editor-toast");

let activeFilter = "all";
let activeCatalogView = "grid";
let activeModalProduct = null;
let quoteItems = [];
let editorSession = null;
let editingProduct = null;
let pendingDelete = null;
let previewObjectUrl = null;
let droppedImageFile = null;
const productLanguages = ["az", "en", "tr", "ru", "ka"];
const localizedEditorFields = ["name", "summary", "specs", "tags"];
let activeEditorLanguage = "az";
let editorSourceLanguage = "az";
let editorTranslationDrafts = {};
let editedTranslationLanguages = new Set();
let editorTranslationsNeedRefresh = false;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function productMatches(product, query) {
  const displayProduct = localizedProduct(product);
  const haystack = [
    displayProduct.name,
    product.name,
    product.brand,
    displayProduct.summary,
    product.category,
    categoryLabel(product.category),
    product.model,
    product.sku,
    product.internalId,
    ...(product.workbookCodes || []),
    ...(displayProduct.tags || []),
    ...(displayProduct.specs || []),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function productCard(product) {
  const displayProduct = localizedProduct(product);
  const tagMarkup = (displayProduct.tags || []).slice(0, 3).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
  const availability = product.availability || { status: "unavailable", quantity: null };
  const report = availability.reportMonth && availability.reportYear
    ? localizedReportDate({ month: availability.reportMonth, year: availability.reportYear })
    : t("Not available");
  const canEditProducts = editorSession
    && ["administrator", "product_editor"].includes(editorSession.platformRole || "administrator");
  const editorActions = canEditProducts
    ? `
      <div class="product-admin-actions">
        <button type="button" data-edit="${escapeHtml(product.id)}" aria-label="${escapeHtml(t("Edit {name}", { name: displayProduct.name }))}" title="${escapeHtml(t("Edit product"))}">
          <i data-lucide="pencil"></i>
        </button>
        <button class="delete" type="button" data-delete="${escapeHtml(product.id)}" aria-label="${escapeHtml(t("Delete {name}", { name: displayProduct.name }))}" title="${escapeHtml(t("Delete product"))}">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    `
    : "";
  return `
    <article class="product-card" data-id="${escapeHtml(product.id)}">
      ${editorActions}
      <button class="product-image-button" type="button" data-detail="${escapeHtml(product.id)}" aria-label="${escapeHtml(t("View details for {name}", { name: displayProduct.name }))}">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(displayProduct.name)}" loading="lazy" decoding="async" />
      </button>
      <div class="product-body">
        <div class="product-meta">
          <span>${escapeHtml(categoryLabel(product.category))}</span>
          <span>${escapeHtml(product.brand)}</span>
        </div>
        <h3>${escapeHtml(displayProduct.name)}</h3>
        ${product.model ? `<p class="product-model"><span>${escapeHtml(t("Model"))}</span><strong>${escapeHtml(product.model)}</strong></p>` : ""}
        <p>${escapeHtml(displayProduct.summary)}</p>
        <div class="product-stock-row">
          <span class="availability-badge ${escapeHtml(availability.status)}"><i data-lucide="${availability.status === "in_stock" ? "circle-check" : availability.status === "out_of_stock" ? "circle-x" : "circle-help"}"></i>${escapeHtml(availabilityLabel(availability.status, availability.quantity))}</span>
          <span class="product-report-date" title="${escapeHtml(t("Latest inventory report"))}"><i data-lucide="calendar-days"></i>${escapeHtml(report)}</span>
        </div>
        <div class="product-tags">${tagMarkup}</div>
        <div class="product-actions">
          <button class="quote-button" type="button" data-quote="${escapeHtml(product.id)}">
            <i data-lucide="file-text"></i>
            ${escapeHtml(t("Request quote"))}
          </button>
          <button class="details-button" type="button" data-detail="${escapeHtml(product.id)}" aria-label="${escapeHtml(t("View details"))}">
            <i data-lucide="eye"></i>
          </button>
        </div>
      </div>
    </article>
  `;
}

function getVisibleProducts() {
  const query = searchInput.value || "";
  const selectedAvailability = availabilityFilter?.value || "all";
  const selectedBrand = brandFilter?.value || "all";
  const visible = products.filter((product) => {
    const categoryMatch = activeFilter === "all" || product.category === activeFilter;
    const availabilityMatch = selectedAvailability === "all"
      || product.availability?.status === selectedAvailability;
    const brandMatch = selectedBrand === "all" || product.brand === selectedBrand;
    return categoryMatch && availabilityMatch && brandMatch && productMatches(product, query);
  });
  const sort = sortSelect?.value || "default";
  return visible.sort((a, b) => {
    if (sort === "name") return localizedProduct(a).name.localeCompare(localizedProduct(b).name, i18n?.language);
    if (sort === "category") return categoryLabel(a.category).localeCompare(categoryLabel(b.category), i18n?.language)
      || localizedProduct(a).name.localeCompare(localizedProduct(b).name, i18n?.language);
    if (sort === "newest") return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    if (sort === "availability") return (availabilityOrder[a.availability?.status] ?? 9)
      - (availabilityOrder[b.availability?.status] ?? 9);
    return Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
  });
}

function renderProducts() {
  const visibleProducts = getVisibleProducts();
  grid.classList.toggle("list-view", activeCatalogView === "list");
  grid.innerHTML = visibleProducts.map(productCard).join("");
  count.textContent = t(visibleProducts.length === 1 ? "{count} product" : "{count} products", {
    count: visibleProducts.length,
  });

  grid.querySelectorAll("[data-detail]").forEach((button) => {
    button.addEventListener("click", () => openProductModal(button.dataset.detail));
  });

  grid.querySelectorAll("[data-quote]").forEach((button) => {
    button.addEventListener("click", () => requestProductQuote(button.dataset.quote));
  });

  grid.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => openProductEditor(button.dataset.edit));
  });

  grid.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => openDeleteConfirmation(button.dataset.delete));
  });

  refreshIcons();
}

function populateBrandFilter() {
  if (!brandFilter) return;
  const selected = brandFilter.value;
  const brands = [...new Set(products.map((product) => product.brand).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  brandFilter.innerHTML = `<option value="all">${escapeHtml(t("All brands"))}</option>${brands
    .map((brand) => `<option value="${escapeHtml(brand)}">${escapeHtml(brand)}</option>`)
    .join("")}`;
  if (brands.includes(selected)) brandFilter.value = selected;
}

function renderCategories() {
  if (!categoryGrid) return;
  const descriptions = {
    metering: "Gas and water measurement equipment",
    regulators: "Pressure control and regulation",
    conversion: "Volume correction and data conversion",
    valves: "Isolation and gas control valves",
    hvac: "Heating and climate equipment",
    modems: "Remote monitoring and telemetry",
    accessories: "Components, filters and spare parts",
    cabinets: "Integrated gas cabinet solutions",
  };
  const grouped = products.reduce((map, product) => {
    if (!map.has(product.category)) map.set(product.category, []);
    map.get(product.category).push(product);
    return map;
  }, new Map());
  categoryGrid.innerHTML = [...grouped.entries()].map(([category, items]) => `
    <button class="category-card" type="button" data-category-jump="${escapeHtml(category)}">
      <img src="${escapeHtml(items[0].image)}" alt="" loading="lazy" decoding="async" />
      <span>
        <small>${escapeHtml(t("{count} products", { count: items.length }))}</small>
        <strong>${escapeHtml(categoryLabel(category))}</strong>
        <em>${escapeHtml(t(descriptions[category] || "Industrial product solutions"))}</em>
      </span>
      <i data-lucide="arrow-up-right"></i>
    </button>
  `).join("");
  categoryGrid.querySelectorAll("[data-category-jump]").forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.categoryJump;
      filterButtons.forEach((item) => item.classList.toggle("active", item.dataset.filter === activeFilter));
      renderProducts();
      document.querySelector("#products").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  refreshIcons();
}

function populateQuoteProducts() {
  const selectedProduct = quoteProduct.value;
  const productOptions = products
    .map((product) => `<option value="${escapeHtml(product.id)}">${escapeHtml(localizedProduct(product).name)}</option>`)
    .join("");
  quoteProduct.innerHTML = `<option value="">${escapeHtml(t("Select a product"))}</option>${productOptions}`;
  if (products.some((product) => product.id === selectedProduct)) quoteProduct.value = selectedProduct;
}

function requestProductQuote(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;
  const displayProduct = localizedProduct(product);

  quoteProduct.value = product.id;
  quoteMessage.value = t("I am interested in {name}. Please send price, availability and technical options.", {
    name: displayProduct.name,
  });
  document.querySelector("#buy").scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => quoteMessage.focus({ preventScroll: true }), 450);
}

function renderProductModalContent(product) {
  const displayProduct = localizedProduct(product);
  const availability = product.availability || { status: "unavailable", quantity: null };
  modalImage.src = product.image;
  modalImage.alt = displayProduct.name;
  modalCategory.textContent = `${categoryLabel(product.category)} | ${product.brand}`;
  modalTitle.textContent = displayProduct.name;
  modalDescription.textContent = displayProduct.summary;
  modalModel.textContent = product.model || product.sku || t("Not specified");
  modalAvailability.innerHTML = `<span class="availability-badge ${escapeHtml(availability.status)}">${escapeHtml(availabilityLabel(availability.status, availability.quantity))}</span>`;
  modalReportDate.textContent = availability.reportMonth && availability.reportYear
    ? localizedReportDate({ month: availability.reportMonth, year: availability.reportYear })
    : t("Not available");
  modalSpecs.innerHTML = (displayProduct.specs || []).map((spec) => `<li>${escapeHtml(spec)}</li>`).join("");
  modalWhatsapp.href = `${whatsappBase}?text=${encodeURIComponent(
    t("Hello AzTexnoQaz, I want to request a quote for {name}.", { name: displayProduct.name }),
  )}`;
  updateProductMetadata(product);
}

function renderQuoteItems() {
  quoteItemsList.innerHTML = quoteItems.map((item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    const name = product ? localizedProduct(product).name : item.productName;
    return `<div class="quote-request-item"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(item.quantity ? t("Quantity: {quantity}", { quantity: item.quantity }) : t("Quantity not specified"))}</span><button type="button" data-remove-quote-item="${escapeHtml(item.productId)}" aria-label="${escapeHtml(t("Remove {name}", { name }))}" title="${escapeHtml(t("Remove product"))}"><i data-lucide="trash-2"></i></button></div>`;
  }).join("");
  quoteItemsList.querySelectorAll("[data-remove-quote-item]").forEach((button) => {
    button.addEventListener("click", () => {
      quoteItems = quoteItems.filter((item) => item.productId !== button.dataset.removeQuoteItem);
      renderQuoteItems();
    });
  });
  refreshIcons();
}

function addCurrentQuoteProduct() {
  const product = products.find((item) => item.id === quoteProduct.value);
  if (!product) {
    setFormMessage(quoteFormStatus, t("Choose a product before adding it."), true);
    return;
  }
  const quantity = quoteQuantity.value ? Number(quoteQuantity.value) : null;
  const existing = quoteItems.find((item) => item.productId === product.id);
  if (existing) existing.quantity = quantity;
  else quoteItems.push({ productId: product.id, productName: product.name, quantity });
  quoteProduct.value = "";
  quoteQuantity.value = "";
  setFormMessage(quoteFormStatus);
  renderQuoteItems();
}

function productUrl(product) {
  const url = new URL(window.location.href);
  url.searchParams.set("product", product.slug || product.id);
  return url;
}

function updateProductMetadata(product = null) {
  const canonical = document.querySelector('link[rel="canonical"]');
  const description = document.querySelector('meta[name="description"]');
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');
  const ogImage = document.querySelector('meta[property="og:image"]');
  if (!product) {
    document.title = t("_pageTitle");
    description?.setAttribute("content", t("_pageDescription"));
    canonical?.setAttribute("href", "https://aztexnogaz.com/");
    ogTitle?.setAttribute("content", document.title);
    ogDescription?.setAttribute("content", t("_pageDescription"));
    ogImage?.setAttribute("content", "https://aztexnogaz.com/assets/about-aztexnogaz.jpeg");
    return;
  }
  const displayProduct = localizedProduct(product);
  const title = product.seoTitle || `${displayProduct.name} | AzTexnoQaz LLC`;
  const summary = product.seoDescription || displayProduct.summary;
  const url = productUrl(product);
  const canonicalUrl = new URL(url);
  canonicalUrl.hash = "";
  document.title = title;
  description?.setAttribute("content", summary);
  canonical?.setAttribute("href", canonicalUrl.href);
  ogTitle?.setAttribute("content", title);
  ogDescription?.setAttribute("content", summary);
  ogImage?.setAttribute("content", new URL(product.image, window.location.origin).href);
}

function openProductModal(productId, { syncUrl = true } = {}) {
  const product = products.find((item) => item.id === productId || item.slug === productId);
  if (!product) return;

  activeModalProduct = product;
  renderProductModalContent(product);
  document.body.classList.add("modal-open");
  modal.showModal();
  if (syncUrl) window.history.pushState({ product: product.slug || product.id }, "", productUrl(product));
  refreshIcons();
}

function closeModal({ syncUrl = true } = {}) {
  activeModalProduct = null;
  if (modal.open) {
    modal.close();
  }
  document.body.classList.remove("modal-open");
  updateProductMetadata();
  if (syncUrl) {
    const url = new URL(window.location.href);
    url.searchParams.delete("product");
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }
}

async function submitQuoteForm(event) {
  event.preventDefault();
  const formData = new FormData(quoteForm);
  const selectedProduct = products.find((item) => item.id === formData.get("product"));
  const requestItems = quoteItems.map((item) => ({ ...item }));
  if (selectedProduct && !requestItems.some((item) => item.productId === selectedProduct.id)) {
    requestItems.push({
      productId: selectedProduct.id,
      quantity: formData.get("quantity"),
      requirements: formData.get("message"),
    });
  }
  const contact = String(formData.get("contact") || "").trim();
  const submitButton = quoteForm.querySelector('button[type="submit"]');
  setFormMessage(quoteFormStatus, t("Saving your quotation request..."));
  submitButton.disabled = true;
  try {
    const response = await fetch("/api/quotes", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        enquiryType: "quotation",
        language: i18n?.language || "az",
        customerName: formData.get("name"),
        email: contact.includes("@") ? contact : "",
        phone: contact.includes("@") ? "" : contact,
        preferredContact: contact.includes("@") ? "email" : "phone",
        items: requestItems.length ? requestItems : [{ productId: "", quantity: null }],
        message: formData.get("message"),
        requirements: formData.get("message"),
        website: formData.get("website"),
      }),
    });
    const body = await readApiResponse(response);
    quoteForm.reset();
    quoteItems = [];
    populateQuoteProducts();
    renderQuoteItems();
    setFormMessage(
      quoteFormStatus,
      t("Request saved. Your reference is {reference}.", { reference: body.reference }),
    );
  } catch (error) {
    setFormMessage(quoteFormStatus, error.message, true);
  } finally {
    submitButton.disabled = false;
  }
}

async function readApiResponse(response) {
  let body = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }
  if (!response.ok) {
    const error = new Error(body.error ? t(body.error) : t("The request could not be completed."));
    error.code = body.code;
    error.status = response.status;
    throw error;
  }
  return body;
}

function setFormMessage(element, message = "", isError = false) {
  element.textContent = message;
  element.classList.toggle("error", isError);
}

function showToast(message) {
  editorToast.textContent = message;
  editorToast.hidden = false;
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    editorToast.hidden = true;
  }, 3600);
}

async function loadProducts() {
  try {
    const response = await fetch("/api/products", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const body = await readApiResponse(response);
    products = body.products;
    catalogMetadata = body.catalog || {
      productCount: products.length,
      brandCount: new Set(products.map((product) => product.brand)).size,
      trackedProductCount: 0,
      latestReport: null,
    };
  } catch {
    const [response, translationsResponse, correctionsResponse] = await Promise.all([
      fetch("data/products.json", { cache: "no-store" }),
      fetch("data/product-translations.json", { cache: "no-store" }),
      fetch("data/product-az-corrections.json", { cache: "no-store" }),
    ]);
    if (!response.ok) throw new Error(t("The product catalog could not be loaded."));
    const baseProducts = await response.json();
    const translationData = translationsResponse.ok
      ? await translationsResponse.json()
      : { products: [] };
    const correctionData = correctionsResponse.ok
      ? await correctionsResponse.json()
      : { products: [] };
    const translationById = new Map(
      (translationData.products || []).map((record) => [record.id, record]),
    );
    const correctionById = new Map(
      (correctionData.products || []).map((record) => [record.id, record.translation]),
    );
    products = baseProducts.map((product) => {
      const record = translationById.get(product.id);
      const translations = Object.fromEntries(
        Object.entries(record?.translations || {}).map(([language, translation]) => [
          language,
          { ...translation },
        ]),
      );
      const approvedAzerbaijani = correctionById.get(product.id);
      if (approvedAzerbaijani) {
        translations.az = { ...(translations.az || {}), ...approvedAzerbaijani };
      }
      return {
        ...product,
        sourceLanguage: record?.sourceLanguage || "en",
        translations,
      };
    });
    catalogMetadata = {
      productCount: products.length,
      brandCount: new Set(products.map((product) => product.brand)).size,
      trackedProductCount: 0,
      latestReport: null,
    };
  }
}

async function checkEditorSession() {
  try {
    const response = await fetch("/api/auth/session", {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return;
    const body = await response.json();
    activateEditorSession(body.editor);
  } catch {
    editorSession = null;
  }
}

function activateEditorSession(editor) {
  editorSession = editor;
  editorEmail.textContent = editor.displayName || editor.email;
  editorEmail.title = editor.email;
  editorBar.hidden = false;
  staffAccess.hidden = true;
  const role = editor.platformRole || "administrator";
  manageEditorsButton.hidden = role !== "administrator";
  addProductButton.hidden = !["administrator", "product_editor"].includes(role);
  document.body.classList.add("editor-mode");
}

function openEditorLogin() {
  setFormMessage(editorLoginMessage);
  document.body.classList.add("modal-open");
  editorLoginModal.showModal();
  refreshIcons();
}

function closeEditorLogin() {
  editorLoginModal.close();
  document.body.classList.remove("modal-open");
}

async function submitEditorLogin(event) {
  event.preventDefault();
  setFormMessage(editorLoginMessage);
  editorLoginSubmit.disabled = true;
  const formData = new FormData(editorLoginForm);
  try {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
        deviceName: formData.get("deviceName"),
      }),
    });
    const body = await readApiResponse(response);
    activateEditorSession(body.editor);
    editorLoginForm.reset();
    closeEditorLogin();
    renderProducts();
    handleUrlState();
    showToast(t("Editor mode is active on this device."));
  } catch (error) {
    setFormMessage(editorLoginMessage, error.message, true);
  } finally {
    editorLoginSubmit.disabled = false;
    refreshIcons();
  }
}

async function signOutEditor() {
  editorSignOut.disabled = true;
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
    });
  } finally {
    editorSession = null;
    editorBar.hidden = true;
    staffAccess.hidden = false;
    document.body.classList.remove("editor-mode");
    editorSignOut.disabled = false;
    renderProducts();
    showToast(t("Signed out from this device."));
  }
}

function clearImagePreview() {
  if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
  previewObjectUrl = null;
  droppedImageFile = null;
  editorImage.value = "";
  imageDropZone.classList.remove("has-preview");
  imageDropZone.style.removeProperty("--preview-image");
  editorImagePreview.src = "";
  editorImagePreview.hidden = true;
  imageDropPrompt.hidden = false;
}

function showImagePreview(fileOrUrl) {
  if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
  previewObjectUrl = typeof fileOrUrl === "string" ? null : URL.createObjectURL(fileOrUrl);
  const source = typeof fileOrUrl === "string" ? fileOrUrl : previewObjectUrl;
  editorImagePreview.src = source;
  imageDropZone.style.setProperty("--preview-image", `url("${source.replace(/["\\]/g, "\\$&")}")`);
  imageDropZone.classList.add("has-preview");
  editorImagePreview.hidden = false;
  imageDropPrompt.hidden = true;
}

const availabilityOrder = {
  in_stock: 0,
  low_stock: 1,
  contact: 2,
  out_of_stock: 3,
  unavailable: 4,
};

function availabilityLabel(status, quantity = null) {
  const labels = {
    in_stock: "In stock",
    low_stock: "Low stock",
    out_of_stock: "Out of stock",
    contact: "Contact for availability",
    unavailable: "Inventory information unavailable",
  };
  const label = t(labels[status] || labels.contact);
  return quantity === null || quantity === undefined
    ? label
    : `${label} (${new Intl.NumberFormat(i18n?.language || "az").format(quantity)})`;
}

function localizedReportDate(report) {
  if (!report?.month || !report?.year) return t("Not available");
  return new Intl.DateTimeFormat(i18n?.language || "az", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(report.year, report.month - 1, 1)));
}

function updateCatalogFacts() {
  heroProductCount.textContent = new Intl.NumberFormat(i18n?.language || "az").format(
    catalogMetadata.productCount || products.length,
  );
  heroReportDate.textContent = catalogMetadata.latestReport
    ? localizedReportDate(catalogMetadata.latestReport)
    : t("Not available");
  catalogReportNote.textContent = catalogMetadata.latestReport
    ? t(catalogMetadata.latestReport.sourceType === "connector"
      ? "Stock synchronized from the connected official inventory workbook. Report: {date}."
      : "Stock synchronized from the latest official monthly inventory report. Report: {date}.", {
        date: localizedReportDate(catalogMetadata.latestReport),
      })
    : t("Inventory information is not available yet. Availability is confirmed during quotation.");
}

function emptyTranslationDraft() {
  return { name: "", summary: "", specs: [], tags: [] };
}

function normalizeTranslationDraft(translation = {}) {
  return {
    name: String(translation.name || ""),
    summary: String(translation.summary || ""),
    specs: Array.isArray(translation.specs) ? [...translation.specs] : [],
    tags: Array.isArray(translation.tags) ? [...translation.tags] : [],
  };
}

function readEditorTranslationDraft() {
  return {
    name: productEditorForm.querySelector('[name="name"]').value.trim(),
    summary: productEditorForm.querySelector('[name="summary"]').value.trim(),
    specs: productEditorForm.querySelector('[name="specs"]').value.split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
    tags: productEditorForm.querySelector('[name="tags"]').value.split(",").map((value) => value.trim()).filter(Boolean),
  };
}

function storeEditorTranslationDraft() {
  editorTranslationDrafts[activeEditorLanguage] = readEditorTranslationDraft();
}

function loadEditorTranslationDraft(language) {
  const draft = editorTranslationDrafts[language] || emptyTranslationDraft();
  productEditorForm.querySelector('[name="name"]').value = draft.name;
  productEditorForm.querySelector('[name="summary"]').value = draft.summary;
  productEditorForm.querySelector('[name="specs"]').value = draft.specs.join("\n");
  productEditorForm.querySelector('[name="tags"]').value = draft.tags.join(", ");
  activeEditorLanguage = language;
  editorLanguageButtons.forEach((button) => {
    const isActive = button.dataset.editorLanguage === language;
    button.setAttribute("aria-selected", String(isActive));
    button.tabIndex = isActive ? 0 : -1;
    button.dataset.edited = String(editedTranslationLanguages.has(button.dataset.editorLanguage));
  });
}

function draftCanTranslate(draft) {
  return Boolean(draft?.name && draft?.summary);
}

function splitBrowserTranslationText(text, maxLength = 450) {
  const chunks = [];
  let remaining = String(text);
  while (remaining.length > maxLength) {
    let splitAt = Math.max(
      remaining.lastIndexOf("\n", maxLength),
      remaining.lastIndexOf(". ", maxLength) + 1,
      remaining.lastIndexOf(" ", maxLength),
    );
    if (splitAt < Math.floor(maxLength * 0.5)) splitAt = maxLength;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt);
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

function decodeBrowserTranslationEntities(value) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = String(value);
  return textarea.value;
}

async function requestBrowserTranslationChunk(text, sourceLanguage, targetLanguage) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      const url = new URL("https://api.mymemory.translated.net/get");
      url.searchParams.set("q", text);
      url.searchParams.set("langpair", `${sourceLanguage}|${targetLanguage}`);
      url.searchParams.set("de", salesEmail);
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Translation service returned ${response.status}`);
      const payload = await response.json();
      const translated = payload?.responseData?.translatedText;
      if (!translated || payload?.quotaFinished || Number(payload?.responseStatus || 200) >= 400) {
        throw new Error(payload?.responseDetails || "Translation service returned no text");
      }
      return decodeBrowserTranslationEntities(translated);
    } catch (error) {
      lastError = error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15_000);
  try {
    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", sourceLanguage);
    url.searchParams.set("tl", targetLanguage);
    url.searchParams.set("dt", "t");
    url.searchParams.set("q", text);
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Translation service returned ${response.status}`);
    const payload = await response.json();
    const translated = Array.isArray(payload?.[0])
      ? payload[0].map((segment) => segment?.[0] || "").join("")
      : "";
    if (!translated) throw new Error("Translation service returned no text");
    return translated;
  } catch (error) {
    throw new Error(t("Automatic translation is temporarily unavailable. Try publishing again."), {
      cause: lastError || error,
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function requestBrowserTranslation(text, sourceLanguage, targetLanguage) {
  if (!String(text).trim() || sourceLanguage === targetLanguage) return String(text);
  const chunks = splitBrowserTranslationText(text);
  const translated = [];
  for (const chunk of chunks) {
    translated.push(await requestBrowserTranslationChunk(chunk, sourceLanguage, targetLanguage));
  }
  return translated.join("");
}

function protectEditorTechnicalText(parts, brand) {
  const protectedValues = [];
  const candidates = new Set([String(brand || "").trim()]);
  parts.forEach((part) => {
    String(part)
      .match(/\b(?:[A-Z]{2,}[A-Z0-9./+_-]*|[A-Za-z]*\d[A-Za-z0-9./+_-]*)\b/g)
      ?.forEach((value) => candidates.add(value));
  });
  const protectedParts = parts.map((part) => {
    let text = String(part);
    [...candidates]
      .filter((value) => value.length >= 2)
      .sort((left, right) => right.length - left.length)
      .forEach((value) => {
        if (!text.includes(value)) return;
        let index = protectedValues.indexOf(value);
        if (index < 0) {
          index = protectedValues.length;
          protectedValues.push(value);
        }
        text = text.split(value).join(`ZXQPH${index}QXZ`);
      });
    return text;
  });
  return { protectedParts, protectedValues };
}

function restoreEditorTechnicalText(text, protectedValues) {
  let restored = String(text).trim();
  protectedValues.forEach((value, index) => {
    restored = restored.replace(new RegExp(`ZXQPH${index}QXZ`, "gi"), value);
  });
  return restored;
}

async function translateEditorDraft(sourceDraft, brand, sourceLanguage) {
  const translationSourceLanguage = productLanguages.includes(sourceLanguage)
    ? sourceLanguage
    : activeEditorLanguage;
  const sourceParts = [sourceDraft.name, sourceDraft.summary, ...sourceDraft.specs, ...sourceDraft.tags];
  const { protectedParts, protectedValues } = protectEditorTechnicalText(sourceParts, brand);
  const entries = await Promise.all(productLanguages.map(async (language) => {
    const translatedParts = [];
    for (const part of protectedParts) {
      translatedParts.push(language === translationSourceLanguage
        ? part
        : await requestBrowserTranslation(part, translationSourceLanguage, language));
    }
    const restored = translatedParts.map((part) => restoreEditorTechnicalText(part, protectedValues));
    let index = 0;
    return [language, {
      name: restored[index++],
      summary: restored[index++],
      specs: restored.slice(index, index + sourceDraft.specs.length),
      tags: restored.slice(index + sourceDraft.specs.length),
    }];
  }));
  return { sourceLanguage: translationSourceLanguage, translations: Object.fromEntries(entries) };
}

async function refreshEditorTranslations({
  force = false,
  overwriteManual = false,
  sourceLanguage = editorSourceLanguage,
} = {}) {
  storeEditorTranslationDraft();
  const translationSourceLanguage = productLanguages.includes(sourceLanguage)
    ? sourceLanguage
    : activeEditorLanguage;
  const sourceDraft = editorTranslationDrafts[translationSourceLanguage];
  if ((!force && !editorTranslationsNeedRefresh) || !draftCanTranslate(sourceDraft)) return;

  setFormMessage(productEditorMessage, t("Detecting language and translating product text..."));
  editorLanguageButtons.forEach((button) => { button.disabled = true; });
  editorResetTranslations.disabled = true;

  try {
    const body = await translateEditorDraft(
      sourceDraft,
      productEditorForm.querySelector('[name="brand"]').value.trim(),
      translationSourceLanguage,
    );
    productLanguages.forEach((language) => {
      const preserveManual = !overwriteManual && editedTranslationLanguages.has(language);
      if (language !== translationSourceLanguage && !preserveManual && body.translations?.[language]) {
        editorTranslationDrafts[language] = normalizeTranslationDraft(body.translations[language]);
      }
    });
    editorTranslationDrafts[translationSourceLanguage] = normalizeTranslationDraft(sourceDraft);
    editorSourceLanguage = translationSourceLanguage;
    editorTranslationsNeedRefresh = false;
    setFormMessage(productEditorMessage);
  } finally {
    editorLanguageButtons.forEach((button) => { button.disabled = false; });
    editorResetTranslations.disabled = false;
  }
}

async function resetEditorTranslations() {
  storeEditorTranslationDraft();
  const sourceDraft = editorTranslationDrafts[activeEditorLanguage];
  if (!draftCanTranslate(sourceDraft)) {
    setFormMessage(productEditorMessage, t("Enter a product name and description before resetting translations."), true);
    return;
  }

  editorSourceLanguage = activeEditorLanguage;
  editedTranslationLanguages = new Set([activeEditorLanguage]);
  editorTranslationsNeedRefresh = true;
  try {
    await refreshEditorTranslations({
      force: true,
      overwriteManual: true,
      sourceLanguage: activeEditorLanguage,
    });
    loadEditorTranslationDraft(activeEditorLanguage);
    setFormMessage(productEditorMessage, t("Other languages were translated again from this language."));
  } catch (error) {
    setFormMessage(productEditorMessage, error.message, true);
  }
}

async function selectEditorLanguage(language) {
  if (!productLanguages.includes(language) || language === activeEditorLanguage) return;
  try {
    await refreshEditorTranslations();
    loadEditorTranslationDraft(language);
    productEditorForm.querySelector('[name="name"]').focus();
  } catch (error) {
    setFormMessage(productEditorMessage, error.message, true);
  }
}

async function decodeProductImage(file) {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  } catch {
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = objectUrl;
      await image.decode();
      return {
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        close: () => URL.revokeObjectURL(objectUrl),
      };
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      throw error;
    }
  }
}

async function optimizeProductImage(file) {
  if (file.size > 25 * 1024 * 1024) {
    throw new Error(t("Choose a product photo smaller than 25 MB."));
  }

  let decoded;
  try {
    decoded = await decodeProductImage(file);
  } catch {
    throw new Error(t("The selected file is not a valid product photo."));
  }
  let size = 1200;
  let quality = 0.86;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.fillStyle = "#e8f0f8";
    context.fillRect(0, 0, size, size);

    const backgroundScale = Math.max((size + 80) / decoded.width, (size + 80) / decoded.height);
    const backgroundWidth = Math.round(decoded.width * backgroundScale);
    const backgroundHeight = Math.round(decoded.height * backgroundScale);
    context.save();
    context.filter = `blur(${Math.round(size * 0.025)}px) brightness(0.82) saturate(0.88)`;
    context.drawImage(
      decoded.source,
      Math.round((size - backgroundWidth) / 2),
      Math.round((size - backgroundHeight) / 2),
      backgroundWidth,
      backgroundHeight,
    );
    context.restore();
    context.fillStyle = "rgba(255, 255, 255, 0.18)";
    context.fillRect(0, 0, size, size);

    const availableSize = size;
    const scale = Math.min(availableSize / decoded.width, availableSize / decoded.height);
    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));
    const x = Math.round((size - width) / 2);
    const y = Math.round((size - height) / 2);
    context.drawImage(decoded.source, x, y, width, height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= 900_000) {
      decoded.close();
      return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "product"}.jpg`, {
        type: "image/jpeg",
      });
    }
    quality = Math.max(0.56, quality - 0.07);
    if (attempt >= 3) size = Math.max(900, Math.round(size * 0.9));
  }

  decoded.close();
  throw new Error(t("This photo could not be optimized. Choose a smaller image."));
}

function overrideDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function syncAvailabilityOverrideFields() {
  const status = productEditorForm.querySelector('[name="availabilityOverride"]');
  const reason = productEditorForm.querySelector('[name="overrideReason"]');
  const expiry = productEditorForm.querySelector('[name="overrideExpiresAt"]');
  const active = Boolean(status.value);
  reason.required = active;
  reason.disabled = !active;
  expiry.disabled = !active;
  if (!active) {
    reason.value = "";
    expiry.value = "";
  }
}

function openProductEditor(productId = null) {
  editingProduct = productId ? products.find((product) => product.id === productId) : null;
  productEditorForm.reset();
  clearImagePreview();
  setFormMessage(productEditorMessage);
  productEditorTitle.textContent = t(editingProduct ? "Edit product" : "Add new product");
  productEditorSave.innerHTML = `<i data-lucide="upload-cloud"></i>${escapeHtml(t(editingProduct ? "Publish changes" : "Publish product"))}`;
  editorImage.required = !editingProduct;
  activeEditorLanguage = productLanguages.includes(i18n?.language) ? i18n.language : "az";
  editorSourceLanguage = productLanguages.includes(editingProduct?.sourceLanguage)
    ? editingProduct.sourceLanguage
    : activeEditorLanguage;
  editedTranslationLanguages = new Set();
  editorTranslationsNeedRefresh = false;
  editorTranslationDrafts = Object.fromEntries(
    productLanguages.map((language) => [
      language,
      editingProduct?.translations?.[language]
        ? normalizeTranslationDraft(editingProduct.translations[language])
        : emptyTranslationDraft(),
    ]),
  );

  if (editingProduct) {
    productEditorForm.querySelector('[name="brand"]').value = editingProduct.brand;
    productEditorForm.querySelector('[name="category"]').value = editingProduct.category;
    productEditorForm.querySelector('[name="model"]').value = editingProduct.model || "";
    productEditorForm.querySelector('[name="sku"]').value = editingProduct.sku || "";
    productEditorForm.querySelector('[name="internalId"]').value = editingProduct.internalId || "";
    productEditorForm.querySelector('[name="applications"]').value = (editingProduct.applications || []).join("\n");
    productEditorForm.querySelector('[name="lowStockThreshold"]').value = editingProduct.lowStockThreshold ?? "";
    productEditorForm.querySelector('[name="publicationStatus"]').value = editingProduct.publicationStatus || "published";
    productEditorForm.querySelector('[name="publicQuantity"]').checked = Boolean(editingProduct.publicQuantity);
    productEditorForm.querySelector('[name="availabilityOverride"]').value = editingProduct.availabilityOverride || "";
    productEditorForm.querySelector('[name="overrideReason"]').value = editingProduct.overrideReason || "";
    productEditorForm.querySelector('[name="overrideExpiresAt"]').value = overrideDateTimeLocal(editingProduct.overrideExpiresAt);
    productEditorForm.querySelector('[name="slug"]').value = editingProduct.slug || "";
    productEditorForm.querySelector('[name="seoTitle"]').value = editingProduct.seoTitle || "";
    productEditorForm.querySelector('[name="seoDescription"]').value = editingProduct.seoDescription || "";
    showImagePreview(editingProduct.image);
  }
  syncAvailabilityOverrideFields();
  loadEditorTranslationDraft(activeEditorLanguage);

  document.body.classList.add("modal-open");
  productEditorModal.showModal();
  refreshIcons();
  window.setTimeout(() => productEditorForm.querySelector('[name="name"]').focus(), 50);
}

function closeProductEditor() {
  productEditorModal.close();
  editingProduct = null;
  clearImagePreview();
  document.body.classList.remove("modal-open");
}

async function publishProductRequest(endpoint, method, formData) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await fetch(endpoint, {
        method,
        body: formData,
        credentials: "same-origin",
      });
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise((resolve) => window.setTimeout(resolve, 1200));
    }
  }
  throw new Error(t("The product upload was interrupted. Check your connection and try again."), {
    cause: lastError,
  });
}

async function saveProduct(event) {
  event.preventDefault();
  setFormMessage(productEditorMessage);
  const formData = new FormData(productEditorForm);
  storeEditorTranslationDraft();
  const selectedImage = droppedImageFile || editorImage.files[0];
  if (selectedImage) {
    setFormMessage(productEditorMessage, t("Optimizing product photo..."));
    try {
      formData.set("image", await optimizeProductImage(selectedImage));
    } catch (error) {
      setFormMessage(productEditorMessage, error.message, true);
      return;
    }
  }
  setFormMessage(productEditorMessage, t("Detecting language and translating product text..."));
  try {
    await refreshEditorTranslations();
  } catch (error) {
    setFormMessage(productEditorMessage, error.message, true);
    return;
  }
  storeEditorTranslationDraft();
  const sourceDraft = editorTranslationDrafts[editorSourceLanguage]
    || editorTranslationDrafts[activeEditorLanguage];
  formData.set("name", sourceDraft.name);
  formData.set("summary", sourceDraft.summary);
  formData.set("specs", sourceDraft.specs.join("\n"));
  formData.set("tags", sourceDraft.tags.join(", "));
  formData.set("sourceLanguage", editorSourceLanguage);
  formData.set("requestId", crypto.randomUUID());
  formData.set("translationOverrides", JSON.stringify(
    Object.fromEntries(
      productLanguages.map((language) => [language, editorTranslationDrafts[language]]),
    ),
  ));
  if (editingProduct) formData.set("revision", String(editingProduct.revision));
  setFormMessage(productEditorMessage, t("Saving product..."));

  productEditorSave.disabled = true;
  productEditorSave.classList.add("loading");
  try {
    const endpoint = editingProduct
      ? `/api/admin/products/${encodeURIComponent(editingProduct.id)}`
      : "/api/admin/products";
    const response = await publishProductRequest(
      endpoint,
      editingProduct ? "PUT" : "POST",
      formData,
    );
    const body = await readApiResponse(response);
    const existingIndex = products.findIndex((product) => product.id === body.product.id);
    if (existingIndex >= 0) products.splice(existingIndex, 1, body.product);
    else products.push(body.product);
    catalogMetadata.productCount = products.filter((product) => product.publicationStatus !== "draft").length;
    const message = t(editingProduct ? "Product changes are live." : "New product is live.");
    closeProductEditor();
    populateBrandFilter();
    renderCategories();
    updateCatalogFacts();
    populateQuoteProducts();
    renderProducts();
    showToast(message);
  } catch (error) {
    setFormMessage(productEditorMessage, error.message, true);
    if (error.code === "conflict") await reloadCatalog();
  } finally {
    productEditorSave.disabled = false;
    productEditorSave.classList.remove("loading");
  }
}

function openDeleteConfirmation(productId) {
  pendingDelete = products.find((product) => product.id === productId);
  if (!pendingDelete) return;
  confirmMessage.textContent = t("“{name}” will be removed from the public catalog.", {
    name: localizedProduct(pendingDelete).name,
  });
  confirmModal.showModal();
  refreshIcons();
}

async function deletePendingProduct() {
  if (!pendingDelete) return;
  confirmDelete.disabled = true;
  try {
    const response = await fetch(`/api/admin/products/${encodeURIComponent(pendingDelete.id)}`, {
      method: "DELETE",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision: pendingDelete.revision }),
    });
    await readApiResponse(response);
    products = products.filter((product) => product.id !== pendingDelete.id);
    catalogMetadata.productCount = products.length;
    pendingDelete = null;
    confirmModal.close();
    populateQuoteProducts();
    populateBrandFilter();
    renderCategories();
    updateCatalogFacts();
    renderProducts();
    showToast(t("Product deleted."));
  } catch (error) {
    confirmModal.close();
    showToast(error.message);
    if (error.code === "conflict") await reloadCatalog();
  } finally {
    confirmDelete.disabled = false;
  }
}

async function reloadCatalog() {
  await loadProducts();
  populateBrandFilter();
  renderCategories();
  updateCatalogFacts();
  populateQuoteProducts();
  renderProducts();
}

function formatEditorActivity(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(i18n?.language || undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function renderEditors(editors, currentEditor) {
  const roleLabels = {
    administrator: "Administrator",
    product_editor: "Product editor",
    sales: "Sales",
    inventory_manager: "Inventory manager",
    viewer: "Viewer",
  };
  editorList.innerHTML = editors
    .map((editor) => {
      const isCurrent = editor.email.toLowerCase() === currentEditor.toLowerCase();
      const devices = editor.devices.length
        ? editor.devices
            .map(
              (device) => `
                <li>
                  <i data-lucide="monitor-smartphone"></i>
                  <span>
                    <strong>${escapeHtml(device.deviceName)}</strong>
                    <small>${escapeHtml(device.platform)} &middot; ${escapeHtml(t("Active {date}", { date: formatEditorActivity(device.lastSeenAt) }))}</small>
                  </span>
                </li>
              `,
            )
            .join("")
        : `<li class="no-device"><i data-lucide="monitor-off"></i><span>${escapeHtml(t("No approved device sessions"))}</span></li>`;
      return `
        <div class="editor-list-item">
          <div class="editor-account-header">
            <span class="editor-avatar">${escapeHtml((editor.displayName || editor.email).slice(0, 1).toUpperCase())}</span>
            <span>
              <strong>${escapeHtml(editor.displayName || editor.email)}</strong>
              <small>${escapeHtml(editor.email)}</small>
            </span>
          </div>
          ${
            isCurrent
              ? `<span class="owner-badge"><i data-lucide="shield-check"></i> ${escapeHtml(t("Current"))}</span>`
              : `<button type="button" data-remove-editor="${escapeHtml(editor.email)}" aria-label="${escapeHtml(t("Remove {email}", { email: editor.email }))}" title="${escapeHtml(t("Remove user"))}"><i data-lucide="trash-2"></i></button>`
          }
          <div class="editor-access-label"><i data-lucide="key-round"></i> ${escapeHtml(t(roleLabels[editor.platformRole] || "Viewer"))}</div>
          <ul class="editor-device-list">${devices}</ul>
        </div>
      `;
    })
    .join("");

  editorList.querySelectorAll("[data-remove-editor]").forEach((button) => {
    button.addEventListener("click", () => removeEditor(button.dataset.removeEditor));
  });
  refreshIcons();
}

async function loadEditors() {
  setFormMessage(accessMessage);
  const response = await fetch("/api/admin/editors", {
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  const body = await readApiResponse(response);
  renderEditors(body.editors, body.currentEditor);
}

async function openAccessModal() {
  document.body.classList.add("modal-open");
  accessModal.showModal();
  refreshIcons();
  try {
    await loadEditors();
  } catch (error) {
    setFormMessage(accessMessage, error.message, true);
  }
}

function closeAccessModal() {
  accessModal.close();
  document.body.classList.remove("modal-open");
}

async function addEditor(event) {
  event.preventDefault();
  setFormMessage(accessMessage);
  const formData = new FormData(addEditorForm);
  try {
    const response = await fetch("/api/admin/editors", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: formData.get("displayName"),
        email: formData.get("email"),
        password: formData.get("password"),
        platformRole: formData.get("platformRole"),
      }),
    });
    await readApiResponse(response);
    addEditorForm.reset();
    await loadEditors();
    showToast(t("Administrator account added."));
  } catch (error) {
    setFormMessage(accessMessage, error.message, true);
  }
}

async function removeEditor(email) {
  setFormMessage(accessMessage);
  try {
    const response = await fetch(`/api/admin/editors/${encodeURIComponent(email)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    await readApiResponse(response);
    await loadEditors();
    showToast(t("Administrator account removed."));
  } catch (error) {
    setFormMessage(accessMessage, error.message, true);
  }
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach((item) => item.classList.toggle("active", item === button));
    renderProducts();
  });
});

searchInput.addEventListener("input", renderProducts);
availabilityFilter?.addEventListener("change", renderProducts);
brandFilter?.addEventListener("change", renderProducts);
sortSelect?.addEventListener("change", renderProducts);
viewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeCatalogView = button.dataset.catalogView;
    viewButtons.forEach((item) => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    renderProducts();
  });
});

quoteForm.addEventListener("submit", submitQuoteForm);
quoteAddProduct.addEventListener("click", addCurrentQuoteProduct);

modalQuote.addEventListener("click", () => {
  if (activeModalProduct) {
    const productId = activeModalProduct.id;
    closeModal();
    requestProductQuote(productId);
  }
});

modalClose.addEventListener("click", closeModal);

modalShare.addEventListener("click", async () => {
  if (!activeModalProduct) return;
  const displayProduct = localizedProduct(activeModalProduct);
  const shareData = {
    title: displayProduct.name,
    text: displayProduct.summary,
    url: productUrl(activeModalProduct).href,
  };
  try {
    if (navigator.share) await navigator.share(shareData);
    else {
      await navigator.clipboard.writeText(shareData.url);
      showToast(t("Product link copied."));
    }
  } catch (error) {
    if (error.name !== "AbortError") showToast(t("The product link could not be copied."));
  }
});

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

modal.addEventListener("close", () => {
  document.body.classList.remove("modal-open");
  if (activeModalProduct) {
    activeModalProduct = null;
    updateProductMetadata();
    const url = new URL(window.location.href);
    url.searchParams.delete("product");
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }
});

navToggle.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
  });
});

addProductButton.addEventListener("click", () => openProductEditor());
manageEditorsButton.addEventListener("click", openAccessModal);
staffAccess.addEventListener("click", (event) => {
  event.preventDefault();
  openEditorLogin();
});
editorSignOut.addEventListener("click", signOutEditor);
editorLoginForm.addEventListener("submit", submitEditorLogin);
editorLoginModal.querySelectorAll(".login-dialog-close").forEach((button) => {
  button.addEventListener("click", closeEditorLogin);
});
editorLoginModal.addEventListener("close", () => {
  document.body.classList.remove("modal-open");
});
productEditorForm.addEventListener("submit", saveProduct);
productEditorForm.querySelector('[name="availabilityOverride"]').addEventListener("change", syncAvailabilityOverrideFields);
editorLanguageButtons.forEach((button) => {
  button.addEventListener("click", () => selectEditorLanguage(button.dataset.editorLanguage));
});
editorResetTranslations.addEventListener("click", resetEditorTranslations);
localizedEditorFields.forEach((name) => {
  productEditorForm.querySelector(`[name="${name}"]`).addEventListener("input", () => {
    if (editedTranslationLanguages.size === 0) {
      editorSourceLanguage = activeEditorLanguage;
    }
    editedTranslationLanguages.add(activeEditorLanguage);
    editorTranslationsNeedRefresh = true;
    const activeButton = editorLanguageButtons.find(
      (button) => button.dataset.editorLanguage === activeEditorLanguage,
    );
    if (activeButton) activeButton.dataset.edited = "true";
  });
});
productEditorForm.querySelector('[name="brand"]').addEventListener("input", () => {
  editorTranslationsNeedRefresh = true;
});
productEditorModal.querySelectorAll(".editor-dialog-close").forEach((button) => {
  button.addEventListener("click", closeProductEditor);
});
productEditorModal.addEventListener("close", () => {
  document.body.classList.remove("modal-open");
});

editorImage.addEventListener("change", () => {
  droppedImageFile = null;
  const [file] = editorImage.files;
  editorImage.required = !editingProduct;
  if (file) showImagePreview(file);
});

["dragenter", "dragover"].forEach((eventName) => {
  imageDropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    imageDropZone.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  imageDropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    imageDropZone.classList.remove("dragging");
  });
});

imageDropZone.addEventListener("drop", (event) => {
  const [file] = event.dataTransfer.files;
  if (!file) return;
  droppedImageFile = file;
  editorImage.required = false;
  showImagePreview(file);
});

accessModal.querySelector(".access-dialog-close").addEventListener("click", closeAccessModal);
accessModal.addEventListener("close", () => {
  document.body.classList.remove("modal-open");
});
addEditorForm.addEventListener("submit", addEditor);

confirmCancel.addEventListener("click", () => {
  pendingDelete = null;
  confirmModal.close();
});
confirmDelete.addEventListener("click", deletePendingProduct);
confirmModal.addEventListener("close", () => {
  pendingDelete = null;
});

window.addEventListener("aztexnogaz:languagechange", () => {
  populateQuoteProducts();
  renderQuoteItems();
  populateBrandFilter();
  renderCategories();
  updateCatalogFacts();
  renderProducts();

  if (activeModalProduct && modal.open) {
    renderProductModalContent(activeModalProduct);
  }

  if (productEditorModal.open) {
    productEditorTitle.textContent = t(editingProduct ? "Edit product" : "Add new product");
    productEditorSave.innerHTML = `<i data-lucide="upload-cloud"></i>${escapeHtml(t(editingProduct ? "Publish changes" : "Publish product"))}`;
  }

  if (accessModal.open) loadEditors().catch((error) => setFormMessage(accessMessage, error.message, true));
  refreshIcons();
});

function handleUrlState() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("product");
  if (productId) {
    const product = products.find((item) => item.id === productId || item.slug === productId);
    if (product && (!modal.open || activeModalProduct?.id !== product.id)) {
      openProductModal(product.id, { syncUrl: false });
    }
  } else if (modal.open) {
    closeModal({ syncUrl: false });
  }
  if (!editorSession) return;
  const editId = params.get("edit");
  if (editId && !productEditorModal.open) openProductEditor(editId);
  if (params.get("addProduct") === "1" && !productEditorModal.open) openProductEditor();
}

window.addEventListener("popstate", handleUrlState);

async function initializeSite() {
  try {
    await Promise.all([loadProducts(), checkEditorSession()]);
  } catch (error) {
    count.textContent = t("Catalog unavailable");
    grid.innerHTML = `<p class="catalog-error">${escapeHtml(error.message)}</p>`;
    refreshIcons();
    return;
  }
  populateBrandFilter();
  renderCategories();
  populateQuoteProducts();
  updateCatalogFacts();
  renderProducts();
  handleUrlState();
  refreshIcons();
}

initializeSite();
