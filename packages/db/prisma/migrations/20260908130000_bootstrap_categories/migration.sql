-- Required reference data must be available after migrate deploy, without a demo seed.
-- Preserve existing seeded category IDs and all transaction/budget references.
INSERT INTO "Category" ("id", "name", "icon", "color", "isSystem", "userId")
SELECT defaults.id, defaults.name, defaults.icon, defaults.color, true, NULL
FROM (VALUES
  ('system_food_drink', 'Food & Drink', '🍔', '#FF6B6B'),
  ('system_transportation', 'Transportation', '🚗', '#4ECDC4'),
  ('system_shopping', 'Shopping', '🛍️', '#45B7D1'),
  ('system_entertainment', 'Entertainment', '🎬', '#96CEB4'),
  ('system_health_fitness', 'Health & Fitness', '💪', '#FFEAA7'),
  ('system_personal_care', 'Personal Care', '💅', '#DDA0DD'),
  ('system_home', 'Home', '🏠', '#98D8C8'),
  ('system_travel', 'Travel', '✈️', '#F7DC6F'),
  ('system_utilities', 'Utilities', '⚡', '#85C1E9'),
  ('system_subscriptions', 'Subscriptions', '📱', '#BB8FCE'),
  ('system_income', 'Income', '💰', '#58D68D'),
  ('system_transfer', 'Transfer', '↔️', '#ABB2B9'),
  ('system_loan_payments', 'Loan Payments', '🏦', '#EC7063'),
  ('system_medical', 'Medical', '🏥', '#76D7C4'),
  ('system_education', 'Education', '📚', '#F0B27A'),
  ('system_other', 'Other', '📦', '#CCD1D1')
) AS defaults(id, name, icon, color)
WHERE NOT EXISTS (
  SELECT 1 FROM "Category" existing
  WHERE existing."isSystem" = true AND existing."name" = defaults.name
);
