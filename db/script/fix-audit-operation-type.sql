-- Fix audit triggers to match AUDIT_LOG.operation_type single-character format

CREATE OR REPLACE FUNCTION audit_magic_link()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "AUDIT_LOG" (
    "table_name", "operation_type", "old_values", "new_values",
    "created_by", "created_at", "user_session_id"
  ) VALUES (
    'MAGIC_LINK',
    CASE
      WHEN TG_OP = 'INSERT' THEN 'I'
      WHEN TG_OP = 'UPDATE' THEN 'U'
      WHEN TG_OP = 'DELETE' THEN 'D'
    END,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    COALESCE(NEW.created_by, OLD.created_by),
    CURRENT_TIMESTAMP,
    NULL
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION audit_notification_inbox()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "AUDIT_LOG" (
    "table_name", "operation_type", "old_values", "new_values",
    "created_by", "created_at", "user_session_id"
  ) VALUES (
    'NOTIFICATION_INBOX',
    CASE
      WHEN TG_OP = 'INSERT' THEN 'I'
      WHEN TG_OP = 'UPDATE' THEN 'U'
      WHEN TG_OP = 'DELETE' THEN 'D'
    END,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    COALESCE(NEW.created_by, OLD.created_by),
    CURRENT_TIMESTAMP,
    NULL
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION audit_browser_notification_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "AUDIT_LOG" (
    "table_name", "operation_type", "old_values", "new_values",
    "created_by", "created_at", "user_session_id"
  ) VALUES (
    'BROWSER_NOTIFICATION_LOG',
    CASE
      WHEN TG_OP = 'INSERT' THEN 'I'
      WHEN TG_OP = 'UPDATE' THEN 'U'
      WHEN TG_OP = 'DELETE' THEN 'D'
    END,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    COALESCE(NEW.created_by, OLD.created_by),
    CURRENT_TIMESTAMP,
    NULL
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION audit_error_catalog()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "AUDIT_LOG" (
    "table_name", "operation_type", "old_values", "new_values",
    "created_by", "created_at", "user_session_id"
  ) VALUES (
    'ERROR_CATALOG',
    CASE
      WHEN TG_OP = 'INSERT' THEN 'I'
      WHEN TG_OP = 'UPDATE' THEN 'U'
      WHEN TG_OP = 'DELETE' THEN 'D'
    END,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    COALESCE(NEW.created_by, OLD.created_by),
    CURRENT_TIMESTAMP,
    NULL
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION audit_error_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "AUDIT_LOG" (
    "table_name", "operation_type", "old_values", "new_values",
    "created_by", "created_at", "user_session_id"
  ) VALUES (
    'ERROR_LOG',
    CASE
      WHEN TG_OP = 'INSERT' THEN 'I'
      WHEN TG_OP = 'UPDATE' THEN 'U'
      WHEN TG_OP = 'DELETE' THEN 'D'
    END,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    COALESCE(NEW.created_by, OLD.created_by),
    CURRENT_TIMESTAMP,
    NULL
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION audit_prediction_lock()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO "AUDIT_LOG" (
    "table_name", "operation_type", "old_values", "new_values",
    "created_by", "created_at", "user_session_id"
  ) VALUES (
    'PREDICTION_LOCK',
    CASE
      WHEN TG_OP = 'INSERT' THEN 'I'
      WHEN TG_OP = 'UPDATE' THEN 'U'
      WHEN TG_OP = 'DELETE' THEN 'D'
    END,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    COALESCE(NEW.created_by, OLD.created_by),
    CURRENT_TIMESTAMP,
    NULL
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
