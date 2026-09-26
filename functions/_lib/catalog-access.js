const PUBLIC_PRODUCT_FIELDS = [
  "id",
  "name",
  "brand",
  "category",
  "image",
  "summary",
  "specs",
  "tags",
  "sortOrder",
  "updatedAt",
  "sourceLanguage",
  "translations",
  "model",
  "sku",
  "internalId",
  "applications",
  "slug",
  "seoTitle",
  "seoDescription",
];

const PRIVATE_INVENTORY_FIELDS = [
  "lowStockThreshold",
  "publicQuantity",
  "availabilityOverride",
  "overrideReason",
  "overrideExpiresAt",
  "availability",
  "workbookCodes",
  "inventoryMapped",
];

export function toPublicCatalogProduct(product) {
  return Object.fromEntries(
    PUBLIC_PRODUCT_FIELDS
      .filter((field) => Object.hasOwn(product, field))
      .map((field) => [field, product[field]]),
  );
}

export function toProductEditorProduct(product) {
  const safeProduct = { ...product };
  PRIVATE_INVENTORY_FIELDS.forEach((field) => delete safeProduct[field]);
  return safeProduct;
}

export function applyProductInventoryPermission(details, existingDetails, canManageInventory) {
  if (canManageInventory) {
    return { ...details, publicQuantity: false };
  }

  return {
    ...details,
    lowStockThreshold: existingDetails?.low_stock_threshold == null
      ? null
      : Number(existingDetails.low_stock_threshold),
    publicQuantity: false,
    availabilityOverride: existingDetails?.availability_override || "",
    overrideReason: existingDetails?.override_reason || "",
    overrideExpiresAt: existingDetails?.override_expires_at || null,
  };
}
