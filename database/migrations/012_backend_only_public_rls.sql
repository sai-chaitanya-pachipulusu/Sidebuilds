-- SideBuilds uses its Express API and a trusted postgres connection, not
-- Supabase Auth/Data API roles. Keep public data behind the application's
-- existing authorization. Never add USING (true) to silence advisor warnings.
-- Does not depend on the unreleased feature migrations 010 or 011.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $security$
DECLARE
    target RECORD;
BEGIN
    IF current_user <> 'postgres' OR NOT EXISTS (
        SELECT 1 FROM pg_roles WHERE rolname = current_user AND rolbypassrls
    ) THEN
        RAISE EXCEPTION 'Review the trusted backend role before applying backend-only RLS';
    END IF;
    IF current_setting('server_version_num')::integer < 150000 THEN
        RAISE EXCEPTION 'PostgreSQL 15+ is required for security-invoker views';
    END IF;
    IF EXISTS (
        SELECT 1 FROM pg_policy p
        JOIN pg_class c ON c.oid = p.polrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
    ) THEN
        RAISE EXCEPTION 'Existing public policies require review; no policies were removed';
    END IF;

    FOR target IN
        SELECT c.oid, n.nspname, c.relname, c.relkind, c.relowner
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'S')
          AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_class'::regclass
              AND d.objid = c.oid AND d.deptype = 'e')
        ORDER BY c.relname
    LOOP
        IF pg_get_userbyid(target.relowner) <> 'postgres' THEN
            RAISE EXCEPTION 'Unexpected public object owner for %', target.relname;
        END IF;
        IF target.relkind IN ('r', 'p') THEN
            EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', target.nspname, target.relname);
        ELSIF target.relkind = 'v' THEN
            EXECUTE format('ALTER VIEW %I.%I SET (security_invoker = true)', target.nspname, target.relname);
        END IF;
        IF target.relkind = 'S' THEN
            EXECUTE format('REVOKE ALL PRIVILEGES ON SEQUENCE %I.%I FROM PUBLIC, anon, authenticated',
                target.nspname, target.relname);
        ELSE
            EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM PUBLIC, anon, authenticated',
                target.nspname, target.relname);
        END IF;
    END LOOP;
END
$security$;

-- Stop future application tables/sequences from receiving browser-role grants.
-- The trusted owner and existing service_role grants are retained.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL PRIVILEGES ON TABLES FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
    REVOKE ALL PRIVILEGES ON SEQUENCES FROM PUBLIC, anon, authenticated;
COMMIT;
