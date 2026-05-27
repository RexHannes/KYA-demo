-- Make audit records append-only via trigger
CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit records are immutable. Attempted to mutate event ID: %', OLD.id;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_immutable
  BEFORE UPDATE OR DELETE ON kya_audit_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_mutation();
