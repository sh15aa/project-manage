/*
# Create products and tasks tables (single-tenant, no auth)

1. New Tables
- `products`
  - `id` (uuid, primary key)
  - `name` (text, not null)
  - `description` (text, nullable — short description of the product)
  - `url` (text, nullable — live URL if hosted)
  - `tag` (text, not null — category label: 'app', 'web-app', 'tool', 'saas', 'made-for-fun', etc.)
  - `status` (text, not null — lifecycle stage: 'idea', 'in-progress', 'working', 'complete', 'hosted', 'pending')
  - `sort_order` (integer, default 0 — manual ordering)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
- `tasks`
  - `id` (uuid, primary key)
  - `product_id` (uuid, FK to products, cascade delete)
  - `title` (text, not null)
  - `done` (boolean, default false)
  - `created_at` (timestamptz)

2. Security
- Enable RLS on both tables.
- Allow anon + authenticated full CRUD because this is a single-tenant shared dashboard with no sign-in.

3. Notes
- `tag` and `status` are free-form text (not enums) so the user can add new tags/statuses without migrations.
- `updated_at` auto-updates via trigger on row update.
*/

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  url text,
  tag text NOT NULL DEFAULT 'web-app',
  status text NOT NULL DEFAULT 'idea',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_product_id ON tasks(product_id);
CREATE INDEX IF NOT EXISTS idx_products_tag ON products(tag);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- products policies
DROP POLICY IF EXISTS "anon_select_products" ON products;
CREATE POLICY "anon_select_products" ON products FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_products" ON products;
CREATE POLICY "anon_insert_products" ON products FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_products" ON products;
CREATE POLICY "anon_update_products" ON products FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_products" ON products;
CREATE POLICY "anon_delete_products" ON products FOR DELETE
  TO anon, authenticated USING (true);

-- tasks policies
DROP POLICY IF EXISTS "anon_select_tasks" ON tasks;
CREATE POLICY "anon_select_tasks" ON tasks FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_tasks" ON tasks;
CREATE POLICY "anon_insert_tasks" ON tasks FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_tasks" ON tasks;
CREATE POLICY "anon_update_tasks" ON tasks FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_tasks" ON tasks;
CREATE POLICY "anon_delete_tasks" ON tasks FOR DELETE
  TO anon, authenticated USING (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();