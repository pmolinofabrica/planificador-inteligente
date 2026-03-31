const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.zgzqeusbpobrwanvktyz:UcA5EQxfEYd1Nb@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
});

async function runPg() {
  await client.connect();

  const sql = `
    -- Crear la función de trigger para auditoría
    CREATE OR REPLACE FUNCTION fn_auditoria_calendario()
    RETURNS TRIGGER AS $$
    DECLARE
        v_datos_anteriores JSONB;
        v_datos_nuevos JSONB;
        v_registro_id VARCHAR(100);
        v_usuario_db VARCHAR(50);
    BEGIN
        v_usuario_db := current_user;

        IF (TG_OP = 'DELETE') THEN
            v_registro_id := OLD.fecha || '_' || OLD.id_turno || '_' || OLD.id_dispositivo;
            v_datos_anteriores := row_to_json(OLD)::jsonb;
            v_datos_nuevos := NULL;

            INSERT INTO public.auditoria_calendario(
                operacion, usuario_db, esquema_tabla, nombre_tabla, registro_id, datos_anteriores, datos_nuevos
            ) VALUES (
                TG_OP, v_usuario_db, TG_TABLE_SCHEMA, TG_TABLE_NAME, v_registro_id, v_datos_anteriores, v_datos_nuevos
            );
            RETURN OLD;

        ELSIF (TG_OP = 'UPDATE') THEN
            -- Solo auditar si hubo cambios en los campos clave (cupo_objetivo en este caso)
            -- Si quieres registrar cada vez sin importar si cambió algo específico, remueve el IF
            IF ROW(NEW.*) IS DISTINCT FROM ROW(OLD.*) THEN
                v_registro_id := NEW.fecha || '_' || NEW.id_turno || '_' || NEW.id_dispositivo;
                v_datos_anteriores := row_to_json(OLD)::jsonb;
                v_datos_nuevos := row_to_json(NEW)::jsonb;

                INSERT INTO public.auditoria_calendario(
                    operacion, usuario_db, esquema_tabla, nombre_tabla, registro_id, datos_anteriores, datos_nuevos
                ) VALUES (
                    TG_OP, v_usuario_db, TG_TABLE_SCHEMA, TG_TABLE_NAME, v_registro_id, v_datos_anteriores, v_datos_nuevos
                );
            END IF;
            RETURN NEW;

        ELSIF (TG_OP = 'INSERT') THEN
            v_registro_id := NEW.fecha || '_' || NEW.id_turno || '_' || NEW.id_dispositivo;
            v_datos_anteriores := NULL;
            v_datos_nuevos := row_to_json(NEW)::jsonb;

            INSERT INTO public.auditoria_calendario(
                operacion, usuario_db, esquema_tabla, nombre_tabla, registro_id, datos_anteriores, datos_nuevos
            ) VALUES (
                TG_OP, v_usuario_db, TG_TABLE_SCHEMA, TG_TABLE_NAME, v_registro_id, v_datos_anteriores, v_datos_nuevos
            );
            RETURN NEW;
        END IF;

        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Eliminar trigger existente si lo hubiera para evitar duplicados
    DROP TRIGGER IF EXISTS trg_auditar_calendario ON public.calendario_dispositivos;

    -- Crear el trigger en la tabla calendario_dispositivos
    CREATE TRIGGER trg_auditar_calendario
    AFTER INSERT OR UPDATE OR DELETE ON public.calendario_dispositivos
    FOR EACH ROW EXECUTE FUNCTION fn_auditoria_calendario();
  `;

  try {
    await client.query(sql);
    console.log("Audit function and trigger created successfully!");
  } catch (err) {
    console.error("Error creating audit function and trigger:", err.message);
  }

  await client.end();
}

runPg();
