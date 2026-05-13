select 'MAGIC_LINK' as table_name, count(*)::int as rows from "MAGIC_LINK"
union all select 'NOTIFICATION_INBOX', count(*)::int from "NOTIFICATION_INBOX"
union all select 'ERROR_CATALOG', count(*)::int from "ERROR_CATALOG"
union all select 'ERROR_LOG', count(*)::int from "ERROR_LOG"
union all select 'PREDICTION_LOCK', count(*)::int from "PREDICTION_LOCK";
