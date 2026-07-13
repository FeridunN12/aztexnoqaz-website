CREATE TABLE IF NOT EXISTS product_translations (
  product_id TEXT NOT NULL,
  language TEXT NOT NULL,
  source_language TEXT NOT NULL,
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  specs_json TEXT NOT NULL,
  tags_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (product_id, language)
);

CREATE INDEX IF NOT EXISTS product_translations_product_id_idx
  ON product_translations(product_id);
