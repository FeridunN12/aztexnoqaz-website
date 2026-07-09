const phonePrimary = "+994505728966";
const whatsappBase = "https://wa.me/994505728966";
const salesEmail = "aztexnogaz@gmail.com";

const categoryLabels = {
  metering: "Metering",
  regulators: "Regulators",
  conversion: "Conversion",
  valves: "Valves",
  hvac: "HVAC",
  accessories: "Accessories",
  cabinets: "Cabinets",
};

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
  const haystack = [product.name, product.brand, product.summary, product.category, ...product.tags].join(" ").toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function productCard(product) {
  const tagMarkup = product.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
  const editorActions = editorSession
    ? `
      <div class="product-admin-actions">
        <button type="button" data-edit="${escapeHtml(product.id)}" aria-label="Edit ${escapeHtml(product.name)}" title="Edit product">
          <i data-lucide="pencil"></i>
        </button>
        <button class="delete" type="button" data-delete="${escapeHtml(product.id)}" aria-label="Delete ${escapeHtml(product.name)}" title="Delete product">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    `
    : "";
  return `
    <article class="product-card" data-id="${escapeHtml(product.id)}">
      ${editorActions}
      <button class="product-image-button" type="button" data-detail="${escapeHtml(product.id)}" aria-label="View details for ${escapeHtml(product.name)}">
        <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async" />
      </button>
      <div class="product-body">
        <div class="product-meta">
          <span>${escapeHtml(categoryLabels[product.category])}</span>
          <span>${escapeHtml(product.brand)}</span>
        </div>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${escapeHtml(product.summary)}</p>
        <div class="product-tags">${tagMarkup}</div>
        <div class="product-actions">
          <button class="quote-button" type="button" data-quote="${escapeHtml(product.id)}">
            <i data-lucide="file-text"></i>
            Request quote
          </button>
          <button class="details-button" type="button" data-detail="${escapeHtml(product.id)}" aria-label="View details">
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
  count.textContent = `${visibleProducts.length} product${visibleProducts.length === 1 ? "" : "s"}`;

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
  const productOptions = products
    .map((product) => `<option value="${escapeHtml(product.name)}">${escapeHtml(product.name)}</option>`)
    .join("");
  quoteProduct.innerHTML = `<option value="">Select a product</option>${productOptions}`;
}

function requestProductQuote(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;

  quoteProduct.value = product.name;
  quoteMessage.value = `I am interested in ${product.name}. Please send price, availability and technical options.`;
  document.querySelector("#buy").scrollIntoView({ behavior: "smooth", block: "start" });
  setTimeout(() => quoteMessage.focus({ preventScroll: true }), 450);
}

function openProductModal(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;

  activeModalProduct = product;
  modalImage.src = product.image;
  modalImage.alt = product.name;
  modalCategory.textContent = `${categoryLabels[product.category]} | ${product.brand}`;
  modalTitle.textContent = product.name;
  modalDescription.textContent = product.summary;
  modalSpecs.innerHTML = product.specs.map((spec) => `<li>${escapeHtml(spec)}</li>`).join("");
  modalWhatsapp.href = `${whatsappBase}?text=${encodeURIComponent(`Hello AzTexnoQaz, I want to request a quote for ${product.name}.`)}`;
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
  const product = formData.get("product") || "General product request";
  const name = formData.get("name") || "";
  const contact = formData.get("contact") || "";
  const message = formData.get("message") || "";
  const subject = `Quote request: ${product}`;
  const body = [
    "Hello AzTexnoQaz,",
    "",
    "I would like to request a quote.",
    "",
    `Product: ${product}`,
    `Name/company: ${name}`,
    `Phone/email: ${contact}`,
    "",
    "Details:",
    message,
    "",
    "Please send price, availability and suitable technical options.",
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
    const error = new Error(body.error || "The request could not be completed.");
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
    if (!response.ok) throw new Error("The product catalog could not be loaded.");
    products = await response.json();
  }
}

async function checkEditorSession() {
  try {
    const response = await fetch("/api/admin/session", {
      cache: "no-store",
      credentials: "same-origin",
      redirect: "manual",
      headers: { Accept: "application/json" },
    });
    if (!response.ok || response.type === "opaqueredirect") return;
    const body = await response.json();
    editorSession = body.editor;
    editorEmail.textContent = editorSession.email;
    editorBar.hidden = false;
    staffAccess.hidden = true;
    manageEditorsButton.hidden = editorSession.role !== "owner";
    editorSignOut.href = `/cdn-cgi/access/logout?returnTo=${encodeURIComponent(window.location.origin)}`;
    document.body.classList.add("editor-mode");
  } catch {
    editorSession = null;
  }
}

function clearImagePreview() {
  if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
  previewObjectUrl = null;
  droppedImageFile = null;
  editorImage.value = "";
  editorImagePreview.src = "";
  editorImagePreview.hidden = true;
  imageDropPrompt.hidden = false;
}

function showImagePreview(fileOrUrl) {
  if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
  previewObjectUrl = typeof fileOrUrl === "string" ? null : URL.createObjectURL(fileOrUrl);
  editorImagePreview.src = typeof fileOrUrl === "string" ? fileOrUrl : previewObjectUrl;
  editorImagePreview.hidden = false;
  imageDropPrompt.hidden = true;
}

async function optimizeProductImage(file) {
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Choose a product photo smaller than 8 MB.");
  }
  if (file.size <= 1_400_000) return file;

  const bitmap = await createImageBitmap(file);
  const maxDimension = 1600;
  const initialScale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  let width = Math.max(1, Math.round(bitmap.width * initialScale));
  let height = Math.max(1, Math.round(bitmap.height * initialScale));
  let quality = 0.84;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (blob && blob.size <= 1_400_000) {
      bitmap.close();
      return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "product"}.webp`, {
        type: "image/webp",
      });
    }
    width = Math.max(1, Math.round(width * 0.82));
    height = Math.max(1, Math.round(height * 0.82));
    quality = Math.max(0.58, quality - 0.07);
  }

  bitmap.close();
  throw new Error("This photo could not be optimized. Choose a smaller image.");
}

function openProductEditor(productId = null) {
  editingProduct = productId ? products.find((product) => product.id === productId) : null;
  productEditorForm.reset();
  clearImagePreview();
  setFormMessage(productEditorMessage);
  productEditorTitle.textContent = editingProduct ? "Edit product" : "Add new product";
  productEditorSave.innerHTML = `<i data-lucide="upload-cloud"></i>${editingProduct ? "Publish changes" : "Publish product"}`;
  editorImage.required = !editingProduct;

  if (editingProduct) {
    productEditorForm.querySelector('[name="name"]').value = editingProduct.name;
    productEditorForm.querySelector('[name="brand"]').value = editingProduct.brand;
    productEditorForm.querySelector('[name="category"]').value = editingProduct.category;
    productEditorForm.querySelector('[name="summary"]').value = editingProduct.summary;
    productEditorForm.querySelector('[name="specs"]').value = editingProduct.specs.join("\n");
    productEditorForm.querySelector('[name="tags"]').value = editingProduct.tags.join(", ");
    showImagePreview(editingProduct.image);
  }

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
  const selectedImage = droppedImageFile || editorImage.files[0];
  if (selectedImage) {
    setFormMessage(productEditorMessage, "Optimizing product photo...");
    try {
      formData.set("image", await optimizeProductImage(selectedImage));
    } catch (error) {
      setFormMessage(productEditorMessage, error.message, true);
      return;
    }
  }
  if (editingProduct) formData.set("revision", String(editingProduct.revision));

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
    const message = editingProduct ? "Product changes are live." : "New product is live.";
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
  confirmMessage.textContent = `“${pendingDelete.name}” will be removed from the public catalog.`;
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
    showToast("Product deleted.");
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

function renderEditors(editors) {
  editorList.innerHTML = editors
    .map(
      (editor) => `
        <div class="editor-list-item">
          <div>
            <span class="editor-avatar">${escapeHtml(editor.email.slice(0, 1).toUpperCase())}</span>
            <span>
              <strong>${escapeHtml(editor.email)}</strong>
              <small>${editor.role === "owner" ? "Owner" : "Product editor"}</small>
            </span>
          </div>
          ${
            editor.role === "owner"
              ? '<span class="owner-badge"><i data-lucide="shield-check"></i> Owner</span>'
              : `<button type="button" data-remove-editor="${escapeHtml(editor.email)}" aria-label="Remove ${escapeHtml(editor.email)}" title="Remove editor"><i data-lucide="trash-2"></i></button>`
          }
        </div>
      `,
    )
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
  renderEditors(body.editors);
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
  const email = new FormData(addEditorForm).get("email");
  try {
    const response = await fetch("/api/admin/editors", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    await readApiResponse(response);
    addEditorForm.reset();
    await loadEditors();
    showToast("Editor access added.");
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
    showToast("Editor access removed.");
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
productEditorForm.addEventListener("submit", saveProduct);
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

async function initializeSite() {
  try {
    await Promise.all([loadProducts(), checkEditorSession()]);
  } catch (error) {
    count.textContent = "Catalog unavailable";
    grid.innerHTML = `<p class="catalog-error">${escapeHtml(error.message)}</p>`;
    refreshIcons();
    return;
  }
  populateQuoteProducts();
  renderProducts();
  refreshIcons();
}

initializeSite();
