-- Политики для должностей (если ещё не созданы)
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage positions" ON positions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND (profiles.role_id = 1 OR profiles.role_id = 2)
      AND profiles.company_id = positions.company_id
  )
);
