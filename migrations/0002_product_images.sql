CREATE TABLE IF NOT EXISTS product_images (
  image_key TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  body BLOB NOT NULL,
  byte_size INTEGER NOT NULL,
  product_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS product_images_product_id_idx
  ON product_images(product_id);
