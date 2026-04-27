DO $$
DECLARE
  trg RECORD;
BEGIN
  -- Drop the specific audit trigger attached to menu.
  FOR trg IN
    SELECT
      n.nspname AS schema_name,
      c.relname AS table_name,
      t.tgname AS trigger_name
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE NOT t.tgisinternal
      AND n.nspname = 'public'
      AND t.tgname = 'trg_menu_auditoria'
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I ON %I.%I',
      trg.trigger_name,
      trg.schema_name,
      trg.table_name
    );
  END LOOP;

  -- Drop the trigger function that wrote into menu_auditoria.
  EXECUTE 'DROP FUNCTION IF EXISTS public.fn_menu_auditoria()';

  -- Finally remove the table itself and anything dependent on it.
  EXECUTE 'DROP TABLE IF EXISTS public.menu_auditoria CASCADE';
END $$;
