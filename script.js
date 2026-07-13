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

const grid = document.querySelector("#product-grid");
const count = document.querySelector("#product-count");
const searchInput = document.querySelector("#product-search");
const filterButtons = document.querySelectorAll("[data-filter]");
const quoteProduct = document.querySelector("#quote-product");
const quoteMessage = document.querySelector("#quote-message");
const quoteForm = document.querySelector("#quote-form");
const modal = document.querySelector("#product-modal");
const modalImage = document.querySelector("#modal-image");
const modalCategory = document.querySelector("#modal-category");
const modalTitle = document.querySelector("#modal-title");
const modalDescription = document.querySelector("#modal-description");
const modalSpecs = document.querySelector("#modal-specs");
const modalQuote = document.querySelector("#modal-quote");
const modalWhatsapp = document.querySelector("#modal-whatsapp");
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
let activeModalProduct = null;
let editorSession = null;
let editingProduct = null;
let pendingDelete = null;
let previewObjectUrl = null;
let droppedImageFile = null;
const productLanguages = ["az", "en", "tr", "ru", "ka"];
const localizedEditorFields = ["name", "summary", "specs", "tags"];
let activeEditorLanguage = "az";
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
    ...displayProduct.tags,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function productCard(product) {
  const displayProduct = localizedProduct(product);
  const tagMarkup = displayProduct.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
  const editorActions = editorSession
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
        <p>${escapeHtml(displayProduct.summary)}</p>
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
  return products.filter((product) => {
    const categoryMatch = activeFilter === "all" || product.category === activeFilter;
    return categoryMatch && productMatches(product, query);
  });
}

function renderProducts() {
  const visibleProducts = getVisibleProducts();
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
  modalImage.src = product.image;
  modalImage.alt = displayProduct.name;
  modalCategory.textContent = `${categoryLabel(product.category)} | ${product.brand}`;
  modalTitle.textContent = displayProduct.name;
  modalDescription.textContent = displayProduct.summary;
  modalSpecs.innerHTML = displayProduct.specs.map((spec) => `<li>${escapeHtml(spec)}</li>`).join("");
  modalWhatsapp.href = `${whatsappBase}?text=${encodeURIComponent(
    t("Hello AzTexnoQaz, I want to request a quote for {name}.", { name: displayProduct.name }),
  )}`;
}

function openProductModal(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;

  activeModalProduct = product;
  renderProductModalContent(product);
  document.body.classList.add("modal-open");
  modal.showModal();
  refreshIcons();
}

function closeModal() {
  if (modal.open) {
    modal.close();
  }
  activeModalProduct = null;
  document.body.classList.remove("modal-open");
}

function submitQuoteForm(event) {
  event.preventDefault();
  const formData = new FormData(quoteForm);
  const selectedProduct = products.find((item) => item.id === formData.get("product"));
  const product = selectedProduct ? localizedProduct(selectedProduct).name : t("General product request");
  const name = formData.get("name") || "";
  const contact = formData.get("contact") || "";
  const message = formData.get("message") || "";
  const subject = t("Quote request: {product}", { product });
  const body = [
    t("Hello AzTexnoQaz,"),
    "",
    t("I would like to request a quote."),
    "",
    t("Product: {product}", { product }),
    t("Name/company: {name}", { name }),
    t("Phone/email: {contact}", { contact }),
    "",
    `${t("Details")}:`,
    message,
    "",
    t("Please send price, availability and suitable technical options."),
  ].join("\n");

  window.location.href = `mailto:${salesEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
  } catch {
    const response = await fetch("data/products.json", { cache: "no-store" });
    if (!response.ok) throw new Error(t("The product catalog could not be loaded."));
    products = await response.json();
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
  manageEditorsButton.hidden = false;
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

async function refreshEditorTranslations() {
  storeEditorTranslationDraft();
  const sourceDraft = editorTranslationDrafts[activeEditorLanguage];
  if (!editorTranslationsNeedRefresh || !draftCanTranslate(sourceDraft)) return;

  const formData = new FormData();
  formData.set("name", sourceDraft.name);
  formData.set("brand", productEditorForm.querySelector('[name="brand"]').value.trim());
  formData.set("category", productEditorForm.querySelector('[name="category"]').value);
  formData.set("summary", sourceDraft.summary);
  formData.set("specs", sourceDraft.specs.join("\n"));
  formData.set("tags", sourceDraft.tags.join(", "));
  setFormMessage(productEditorMessage, t("Detecting language and translating product text..."));
  editorLanguageButtons.forEach((button) => { button.disabled = true; });

  try {
    const response = await fetch("/api/admin/translations", {
      method: "POST",
      body: formData,
      credentials: "same-origin",
    });
    const body = await readApiResponse(response);
    productLanguages.forEach((language) => {
      if (!editedTranslationLanguages.has(language) && body.translations?.[language]) {
        editorTranslationDrafts[language] = normalizeTranslationDraft(body.translations[language]);
      }
    });
    editorTranslationsNeedRefresh = false;
    setFormMessage(productEditorMessage);
  } finally {
    editorLanguageButtons.forEach((button) => { button.disabled = false; });
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

async function optimizeProductImage(file) {
  if (file.size > 8 * 1024 * 1024) {
    throw new Error(t("Choose a product photo smaller than 8 MB."));
  }

  const bitmap = await createImageBitmap(file);
  let size = 1200;
  let quality = 0.88;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    context.fillStyle = "#e8f0f8";
    context.fillRect(0, 0, size, size);

    const backgroundScale = Math.max((size + 80) / bitmap.width, (size + 80) / bitmap.height);
    const backgroundWidth = Math.round(bitmap.width * backgroundScale);
    const backgroundHeight = Math.round(bitmap.height * backgroundScale);
    context.save();
    context.filter = `blur(${Math.round(size * 0.025)}px) brightness(0.82) saturate(0.88)`;
    context.drawImage(
      bitmap,
      Math.round((size - backgroundWidth) / 2),
      Math.round((size - backgroundHeight) / 2),
      backgroundWidth,
      backgroundHeight,
    );
    context.restore();
    context.fillStyle = "rgba(255, 255, 255, 0.18)";
    context.fillRect(0, 0, size, size);

    const availableSize = size;
    const scale = Math.min(availableSize / bitmap.width, availableSize / bitmap.height);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const x = Math.round((size - width) / 2);
    const y = Math.round((size - height) / 2);
    context.drawImage(bitmap, x, y, width, height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= 1_400_000) {
      bitmap.close();
      return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "product"}.jpg`, {
        type: "image/jpeg",
      });
    }
    quality = Math.max(0.56, quality - 0.07);
    if (attempt >= 3) size = Math.max(900, Math.round(size * 0.9));
  }

  bitmap.close();
  throw new Error(t("This photo could not be optimized. Choose a smaller image."));
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
    showImagePreview(editingProduct.image);
  }
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

async function saveProduct(event) {
  event.preventDefault();
  setFormMessage(productEditorMessage);
  const formData = new FormData(productEditorForm);
  storeEditorTranslationDraft();
  const translationOverrides = Object.fromEntries(
    [...editedTranslationLanguages]
      .filter((language) => language !== activeEditorLanguage)
      .map((language) => [language, editorTranslationDrafts[language]]),
  );
  formData.set("translationOverrides", JSON.stringify(translationOverrides));
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
  if (editingProduct) formData.set("revision", String(editingProduct.revision));
  setFormMessage(productEditorMessage, t("Detecting language and translating product text..."));

  productEditorSave.disabled = true;
  productEditorSave.classList.add("loading");
  try {
    const endpoint = editingProduct
      ? `/api/admin/products/${encodeURIComponent(editingProduct.id)}`
      : "/api/admin/products";
    const response = await fetch(endpoint, {
      method: editingProduct ? "PUT" : "POST",
      body: formData,
      credentials: "same-origin",
    });
    const body = await readApiResponse(response);
    const existingIndex = products.findIndex((product) => product.id === body.product.id);
    if (existingIndex >= 0) products.splice(existingIndex, 1, body.product);
    else products.push(body.product);
    const message = t(editingProduct ? "Product changes are live." : "New product is live.");
    closeProductEditor();
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
    pendingDelete = null;
    confirmModal.close();
    populateQuoteProducts();
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
          <div class="editor-access-label"><i data-lucide="key-round"></i> ${escapeHtml(t("Full administrator access"))}</div>
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

quoteForm.addEventListener("submit", submitQuoteForm);

modalQuote.addEventListener("click", () => {
  if (activeModalProduct) {
    const productId = activeModalProduct.id;
    closeModal();
    requestProductQuote(productId);
  }
});

modalClose.addEventListener("click", closeModal);

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

modal.addEventListener("close", () => {
  document.body.classList.remove("modal-open");
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
editorLanguageButtons.forEach((button) => {
  button.addEventListener("click", () => selectEditorLanguage(button.dataset.editorLanguage));
});
localizedEditorFields.forEach((name) => {
  productEditorForm.querySelector(`[name="${name}"]`).addEventListener("input", () => {
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

async function initializeSite() {
  try {
    await Promise.all([loadProducts(), checkEditorSession()]);
  } catch (error) {
    count.textContent = t("Catalog unavailable");
    grid.innerHTML = `<p class="catalog-error">${escapeHtml(error.message)}</p>`;
    refreshIcons();
    return;
  }
  populateQuoteProducts();
  renderProducts();
  refreshIcons();
}

initializeSite();
