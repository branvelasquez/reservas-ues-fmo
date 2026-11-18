-- =====================================================================
-- Sistema de Reserva de Laboratorios y Aulas de Cómputo - UES FMO
-- Base de datos: PostgreSQL 14+  |  Alineado a la línea base v3 (IR, Avance 5)
-- Ejecutar:  psql -U postgres -d reservas_ues -f reservas_ues_fmo.sql
-- =====================================================================

-- Para la restricción de exclusión (igualdad + traslape de rangos)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Limpieza para poder re-ejecutar el script en desarrollo
DROP TABLE IF EXISTS notificacion, asistencia_reserva, historial_reserva,
    equipo_requerido, reserva_software, reserva, criterio_prioridad,
    tipo_actividad, estado_reserva, bloqueo_espacio, dia_horario,
    horario_clase, ciclo, materia, espacio_software, software,
    espacio_equipo, equipo, espacio, tipo_espacio, usuario, rol CASCADE;
DROP FUNCTION IF EXISTS fn_conflictos(INT, DATE, TIME, TIME, INT);
DROP FUNCTION IF EXISTS fn_log_reserva() CASCADE;
DROP FUNCTION IF EXISTS fn_historial_inmutable() CASCADE;
DROP FUNCTION IF EXISTS fn_validar_bloqueo_al_aprobar() CASCADE;

-- =====================================================================
-- 1. USUARIOS Y ROLES (RF-01, RF-02, RNF-03)
-- =====================================================================
CREATE TABLE rol (
    id_rol      SMALLINT PRIMARY KEY,
    nombre_rol  VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE usuario (
    id_usuario        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_rol            SMALLINT     NOT NULL REFERENCES rol(id_rol),
    nombre_usuario    VARCHAR(100) NOT NULL,
    correo_usuario    VARCHAR(100) NOT NULL,
    contrasenia_hash  VARCHAR(255) NOT NULL,          -- bcrypt, nunca texto plano
    activo            BOOLEAN      NOT NULL DEFAULT TRUE,  -- desactivar sin perder historial
    creado_en         TIMESTAMP    NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_usuario_correo ON usuario (lower(correo_usuario));

-- =====================================================================
-- 2. ESPACIOS, EQUIPO Y SOFTWARE (RF-12, RF-04)
-- =====================================================================
CREATE TABLE tipo_espacio (
    id_tipo      SMALLINT PRIMARY KEY,
    nombre_tipo  VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE espacio (
    id_espacio           INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_tipo              SMALLINT     NOT NULL REFERENCES tipo_espacio(id_tipo),
    id_encargado         INT          REFERENCES usuario(id_usuario),  -- responsable (PC-01)
    nombre_espacio       VARCHAR(100) NOT NULL UNIQUE,
    ubicacion_espacio    VARCHAR(100) NOT NULL,
    capacidad_espacio    INT          NOT NULL CHECK (capacidad_espacio > 0),
    activo               BOOLEAN      NOT NULL DEFAULT TRUE,
    -- Reglas configurables por espacio (PC-01, PC-03). NULL = no se valida.
    requiere_aprobacion  BOOLEAN      NOT NULL DEFAULT TRUE,
    anticipacion_min_dias INT         CHECK (anticipacion_min_dias >= 0),
    hora_habil_inicio    TIME,
    hora_habil_fin       TIME,
    CHECK (hora_habil_fin IS NULL OR hora_habil_fin > hora_habil_inicio)
);

CREATE TABLE equipo (
    id_equipo      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_equipo  VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE espacio_equipo (
    id_espacio  INT NOT NULL REFERENCES espacio(id_espacio),
    id_equipo   INT NOT NULL REFERENCES equipo(id_equipo),
    cantidad    INT NOT NULL DEFAULT 1 CHECK (cantidad > 0),   -- p. ej. 30 computadoras
    PRIMARY KEY (id_espacio, id_equipo)
);

CREATE TABLE software (
    id_software           INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_software       VARCHAR(100) NOT NULL,
    version_software      VARCHAR(50)  NOT NULL,
    descripcion_software  VARCHAR(255),
    UNIQUE (nombre_software, version_software)
);

-- Nueva: software instalado en cada espacio (para validar RF-04)
CREATE TABLE espacio_software (
    id_espacio   INT NOT NULL REFERENCES espacio(id_espacio),
    id_software  INT NOT NULL REFERENCES software(id_software),
    PRIMARY KEY (id_espacio, id_software)
);

CREATE TABLE materia (
    id_materia      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_materia  VARCHAR(100) NOT NULL UNIQUE
);

-- =====================================================================
-- 3. HORARIOS INSTITUCIONALES POR CICLO (RF-21)
-- =====================================================================
CREATE TABLE ciclo (
    id_ciclo      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre_ciclo  VARCHAR(50) NOT NULL UNIQUE,
    fecha_inicio  DATE NOT NULL,
    fecha_fin     DATE NOT NULL,
    CHECK (fecha_fin > fecha_inicio)
);

CREATE TABLE horario_clase (
    id_horario  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_ciclo    INT  NOT NULL REFERENCES ciclo(id_ciclo),
    id_usuario  INT  NOT NULL REFERENCES usuario(id_usuario),   -- docente titular
    id_materia  INT  NOT NULL REFERENCES materia(id_materia),
    id_espacio  INT  NOT NULL REFERENCES espacio(id_espacio),
    hora_inicio TIME NOT NULL,
    hora_fin    TIME NOT NULL,
    CHECK (hora_fin > hora_inicio)
);

-- dia_semana: 1 = lunes ... 7 = domingo (ISO)
CREATE TABLE dia_horario (
    id_horario  INT      NOT NULL REFERENCES horario_clase(id_horario) ON DELETE CASCADE,
    dia_semana  SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
    PRIMARY KEY (id_horario, dia_semana)
);

-- =====================================================================
-- 4. BLOQUEOS TEMPORALES (RF-16)
-- =====================================================================
CREATE TABLE bloqueo_espacio (
    id_bloqueo     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_espacio     INT          NOT NULL REFERENCES espacio(id_espacio),
    id_usuario     INT          REFERENCES usuario(id_usuario),   -- quién bloqueó
    fecha_inicio   TIMESTAMP    NOT NULL,
    fecha_fin      TIMESTAMP    NOT NULL,
    motivo_bloqueo VARCHAR(100) NOT NULL,
    activo         BOOLEAN      NOT NULL DEFAULT TRUE,            -- FALSE = desbloqueado
    CHECK (fecha_fin > fecha_inicio),
    EXCLUDE USING gist (id_espacio WITH =, tsrange(fecha_inicio, fecha_fin) WITH &&)
        WHERE (activo)
);

-- =====================================================================
-- 5. CATÁLOGOS DE LA RESERVA (RF-14)
-- =====================================================================
-- IDs fijos: el backend y las restricciones dependen de ellos
CREATE TABLE estado_reserva (
    id_estado      SMALLINT PRIMARY KEY,
    nombre_estado  VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE tipo_actividad (
    id_tipo_actividad  SMALLINT PRIMARY KEY,
    nombre_actividad   VARCHAR(100) NOT NULL UNIQUE
);

-- RF-17 está diferido: se conserva la tabla, pero id_prioridad en reserva admite NULL
CREATE TABLE criterio_prioridad (
    id_prioridad       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_tipo_actividad  SMALLINT NOT NULL REFERENCES tipo_actividad(id_tipo_actividad),
    nivel_prioridad    INT NOT NULL,
    descripcion        VARCHAR(255)
);

-- =====================================================================
-- 6. RESERVAS (RF-03, RF-05, RF-08, RF-14)
-- =====================================================================
CREATE TABLE reserva (
    id_reserva            INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario            INT      NOT NULL REFERENCES usuario(id_usuario),   -- docente solicitante
    id_materia            INT      NOT NULL REFERENCES materia(id_materia),
    id_espacio            INT      NOT NULL REFERENCES espacio(id_espacio),
    id_estado             SMALLINT NOT NULL DEFAULT 1 REFERENCES estado_reserva(id_estado),
    id_tipo_actividad     SMALLINT NOT NULL REFERENCES tipo_actividad(id_tipo_actividad),
    id_prioridad          INT      REFERENCES criterio_prioridad(id_prioridad),  -- NULL (RF-17 diferido)
    grupo                 VARCHAR(20),
    objetivo              VARCHAR(255) NOT NULL,
    fecha_reserva         DATE     NOT NULL,
    hora_inicio           TIME     NOT NULL,
    hora_fin              TIME     NOT NULL,
    cantidad_estudiantes  INT      NOT NULL CHECK (cantidad_estudiantes > 0),
    es_extraordinaria     BOOLEAN  NOT NULL DEFAULT FALSE,   -- cruce con horario del ciclo (RN-02)
    motivo_decision       VARCHAR(255),
    id_usuario_decision   INT      REFERENCES usuario(id_usuario),
    fecha_solicitud       TIMESTAMP NOT NULL DEFAULT now(),
    fecha_decision        TIMESTAMP,
    -- Rango de tiempo calculado: base de la restricción anti-traslape
    periodo TSRANGE GENERATED ALWAYS AS
        (tsrange(fecha_reserva + hora_inicio, fecha_reserva + hora_fin)) STORED,

    CHECK (hora_fin > hora_inicio),
    -- RN-07: todo rechazo exige motivo (estado 4 = Rechazada)
    CONSTRAINT ck_rechazo_con_motivo
        CHECK (id_estado <> 4 OR length(trim(coalesce(motivo_decision, ''))) > 0),
    -- RN-01 / RNF-06: un espacio no puede tener dos reservas APROBADAS (estado 3) que se traslapen
    CONSTRAINT ex_sin_traslape_aprobadas
        EXCLUDE USING gist (id_espacio WITH =, periodo WITH &&) WHERE (id_estado = 3)
);

CREATE TABLE reserva_software (
    id_reserva   INT NOT NULL REFERENCES reserva(id_reserva) ON DELETE CASCADE,
    id_software  INT NOT NULL REFERENCES software(id_software),
    PRIMARY KEY (id_reserva, id_software)
);

CREATE TABLE equipo_requerido (
    id_reserva       INT NOT NULL REFERENCES reserva(id_reserva) ON DELETE CASCADE,
    id_equipo        INT NOT NULL REFERENCES equipo(id_equipo),
    cantidad_equipo  INT NOT NULL CHECK (cantidad_equipo > 0),
    PRIMARY KEY (id_reserva, id_equipo)
);

-- RF-18 (opcional, "Podría")
CREATE TABLE asistencia_reserva (
    id_reserva     INT PRIMARY KEY REFERENCES reserva(id_reserva),
    asistio        BOOLEAN NOT NULL,
    hora_llegada   TIME,
    observaciones  VARCHAR(255)
);

-- =====================================================================
-- 7. HISTORIAL INMUTABLE (RF-13, RNF-07)
-- =====================================================================
CREATE TABLE historial_reserva (
    id_historial        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_reserva          INT       NOT NULL REFERENCES reserva(id_reserva),
    id_usuario          INT       NOT NULL REFERENCES usuario(id_usuario),
    id_estado_anterior  SMALLINT  REFERENCES estado_reserva(id_estado),  -- NULL en el primer evento
    id_estado_nuevo     SMALLINT  NOT NULL REFERENCES estado_reserva(id_estado),
    motivo              VARCHAR(255),
    fecha_cambio        TIMESTAMP NOT NULL DEFAULT now()
);

CREATE FUNCTION fn_historial_inmutable() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'El historial es de solo lectura: no se permite % en historial_reserva', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_historial_no_update_delete
    BEFORE UPDATE OR DELETE ON historial_reserva
    FOR EACH ROW EXECUTE FUNCTION fn_historial_inmutable();
CREATE TRIGGER trg_historial_no_truncate
    BEFORE TRUNCATE ON historial_reserva
    FOR EACH STATEMENT EXECUTE FUNCTION fn_historial_inmutable();

-- Registro automático en el historial.
-- El backend indica quién actúa con:  SET LOCAL app.id_usuario = '<id>';  (dentro de la transacción)
CREATE FUNCTION fn_log_reserva() RETURNS trigger AS $$
DECLARE
    v_user INT;
BEGIN
    v_user := COALESCE(NULLIF(current_setting('app.id_usuario', true), '')::INT, NEW.id_usuario);
    IF TG_OP = 'INSERT' THEN
        INSERT INTO historial_reserva (id_reserva, id_usuario, id_estado_anterior, id_estado_nuevo, motivo)
        VALUES (NEW.id_reserva, v_user, NULL, NEW.id_estado, NULL);
    ELSIF NEW.id_estado IS DISTINCT FROM OLD.id_estado THEN
        INSERT INTO historial_reserva (id_reserva, id_usuario, id_estado_anterior, id_estado_nuevo, motivo)
        VALUES (NEW.id_reserva, v_user, OLD.id_estado, NEW.id_estado, NEW.motivo_decision);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reserva_historial_ins AFTER INSERT ON reserva
    FOR EACH ROW EXECUTE FUNCTION fn_log_reserva();
CREATE TRIGGER trg_reserva_historial_upd AFTER UPDATE ON reserva
    FOR EACH ROW EXECUTE FUNCTION fn_log_reserva();

-- =====================================================================
-- 8. NOTIFICACIONES (RF-10)
-- =====================================================================
CREATE TABLE notificacion (
    id_notificacion       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_reserva            INT          NOT NULL REFERENCES reserva(id_reserva),
    id_usuario            INT          NOT NULL REFERENCES usuario(id_usuario),  -- destinatario
    tipo_notificacion     VARCHAR(50)  NOT NULL,      -- Aprobada, Rechazada, Cancelada, Recordatorio
    mensaje_notificacion  VARCHAR(255) NOT NULL,
    fecha_envio           TIMESTAMP    NOT NULL DEFAULT now(),
    leida                 BOOLEAN      NOT NULL DEFAULT FALSE,   -- aviso visible en el sistema
    enviada_correo        BOOLEAN      NOT NULL DEFAULT FALSE
);

-- =====================================================================
-- 9. DISPONIBILIDAD (RF-05, RF-06, RN-01, RN-02)
-- Devuelve todo lo que ocupa el espacio en el rango pedido:
--   reserva_aprobada | bloqueo | horario_ciclo
-- Si hay 'reserva_aprobada' o 'bloqueo'  -> la solicitud NO se registra.
-- Si solo hay 'horario_ciclo'            -> se registra como extraordinaria.
-- =====================================================================
CREATE FUNCTION fn_conflictos(
    p_espacio INT, p_fecha DATE, p_ini TIME, p_fin TIME, p_excluir_reserva INT DEFAULT NULL
) RETURNS TABLE (tipo TEXT, id_referencia INT, detalle TEXT, inicio TIMESTAMP, fin TIMESTAMP)
LANGUAGE sql STABLE AS $$
    SELECT 'reserva_aprobada', r.id_reserva, 'Reserva aprobada'::TEXT,
           p_fecha + r.hora_inicio, p_fecha + r.hora_fin
      FROM reserva r
     WHERE r.id_espacio = p_espacio AND r.id_estado = 3
       AND r.fecha_reserva = p_fecha
       AND r.id_reserva IS DISTINCT FROM p_excluir_reserva
       AND p_ini < r.hora_fin AND p_fin > r.hora_inicio
    UNION ALL
    SELECT 'bloqueo', b.id_bloqueo, b.motivo_bloqueo::TEXT, b.fecha_inicio, b.fecha_fin
      FROM bloqueo_espacio b
     WHERE b.id_espacio = p_espacio AND b.activo
       AND tsrange(b.fecha_inicio, b.fecha_fin) && tsrange(p_fecha + p_ini, p_fecha + p_fin)
    UNION ALL
    SELECT 'horario_ciclo', h.id_horario, m.nombre_materia::TEXT,
           p_fecha + h.hora_inicio, p_fecha + h.hora_fin
      FROM horario_clase h
      JOIN ciclo c        ON c.id_ciclo = h.id_ciclo
      JOIN dia_horario d  ON d.id_horario = h.id_horario
      JOIN materia m      ON m.id_materia = h.id_materia
     WHERE h.id_espacio = p_espacio
       AND p_fecha BETWEEN c.fecha_inicio AND c.fecha_fin
       AND d.dia_semana = EXTRACT(ISODOW FROM p_fecha)
       AND p_ini < h.hora_fin AND p_fin > h.hora_inicio;
$$;

-- Al aprobar (estado 3) no se permite si hay un bloqueo activo en ese horario.
-- (El traslape con otras aprobadas ya lo impide ex_sin_traslape_aprobadas.)
-- (El rango se calcula aquí porque la columna generada aún no existe en un trigger BEFORE.)
CREATE FUNCTION fn_validar_bloqueo_al_aprobar() RETURNS trigger AS $$
BEGIN
    IF NEW.id_estado = 3 AND EXISTS (
        SELECT 1 FROM bloqueo_espacio b
         WHERE b.id_espacio = NEW.id_espacio AND b.activo
           AND tsrange(b.fecha_inicio, b.fecha_fin) &&
               tsrange(NEW.fecha_reserva + NEW.hora_inicio, NEW.fecha_reserva + NEW.hora_fin)
    ) THEN
        RAISE EXCEPTION 'No se puede aprobar: el espacio está bloqueado en ese horario';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reserva_bloqueo
    BEFORE INSERT OR UPDATE ON reserva
    FOR EACH ROW EXECUTE FUNCTION fn_validar_bloqueo_al_aprobar();

-- =====================================================================
-- 10. ÍNDICES
-- =====================================================================
CREATE INDEX ix_reserva_espacio_fecha ON reserva (id_espacio, fecha_reserva);
CREATE INDEX ix_reserva_usuario       ON reserva (id_usuario);
CREATE INDEX ix_reserva_estado        ON reserva (id_estado);
CREATE INDEX ix_horario_espacio       ON horario_clase (id_espacio);
CREATE INDEX ix_historial_reserva     ON historial_reserva (id_reserva);
CREATE INDEX ix_notif_usuario         ON notificacion (id_usuario, leida);

-- =====================================================================
-- 11. DATOS INICIALES (catálogos fijos)
-- =====================================================================
INSERT INTO rol VALUES (1,'Administrador'), (2,'Encargado'), (3,'Académica'), (4,'Docente');

INSERT INTO estado_reserva VALUES
    (1,'Pendiente de revisión'), (2,'En revisión'), (3,'Aprobada'),
    (4,'Rechazada'), (5,'Cancelada');

INSERT INTO tipo_espacio VALUES (1,'Aula de cómputo'), (2,'Laboratorio de cómputo'), (3,'Laboratorio de Realidad Virtual');

INSERT INTO tipo_actividad VALUES
    (1,'Clase'), (2,'Práctica'), (3,'Examen parcial'),
    (4,'Examen diferido o repetido'), (5,'Prueba institucional'), (6,'Otra');

-- =====================================================================
-- 12. DATOS DE PRUEBA (reemplazar en producción)
-- El hash es un MARCADOR: el backend debe generar los hashes con bcrypt.
-- =====================================================================
INSERT INTO usuario (id_rol, nombre_usuario, correo_usuario, contrasenia_hash) VALUES
    (1,'Administrador del sistema','admin@ues.edu.sv','$2b$10$REEMPLAZAR_CON_HASH_BCRYPT'),
    (2,'Encargada Centros de Cómputo','encargada@ues.edu.sv','$2b$10$REEMPLAZAR_CON_HASH_BCRYPT'),
    (3,'Administración Académica','academica@ues.edu.sv','$2b$10$REEMPLAZAR_CON_HASH_BCRYPT'),
    (4,'Docente Uno','docente1@ues.edu.sv','$2b$10$REEMPLAZAR_CON_HASH_BCRYPT'),
    (4,'Docente Dos','docente2@ues.edu.sv','$2b$10$REEMPLAZAR_CON_HASH_BCRYPT');

INSERT INTO espacio (id_tipo, id_encargado, nombre_espacio, ubicacion_espacio, capacidad_espacio,
                     requiere_aprobacion, anticipacion_min_dias)
SELECT 1, u.id_usuario, 'Centro de Cómputo A', 'Edificio de Ingeniería, planta baja', 30, FALSE, NULL
  FROM usuario u WHERE u.correo_usuario = 'encargada@ues.edu.sv'
UNION ALL
SELECT 1, u.id_usuario, 'Centro de Cómputo B', 'Edificio de Ingeniería, planta baja', 35, FALSE, NULL
  FROM usuario u WHERE u.correo_usuario = 'encargada@ues.edu.sv'
UNION ALL
SELECT 2, u.id_usuario, 'Laboratorio de Cómputo', 'Edificio de Ingeniería, segundo nivel', 25, TRUE, NULL
  FROM usuario u WHERE u.correo_usuario = 'encargada@ues.edu.sv';

INSERT INTO equipo (nombre_equipo) VALUES ('Computadoras'), ('Pantalla / proyector'), ('Aire acondicionado');
INSERT INTO espacio_equipo (id_espacio, id_equipo, cantidad)
SELECT e.id_espacio, q.id_equipo, CASE q.nombre_equipo WHEN 'Computadoras' THEN e.capacidad_espacio ELSE 1 END
  FROM espacio e CROSS JOIN equipo q;

INSERT INTO software (nombre_software, version_software, descripcion_software) VALUES
    ('Visual Studio Code','1.9x','Editor de código'),
    ('XAMPP','8.2','Servidor Apache, MySQL y PHP'),
    ('PostgreSQL','16','Gestor de base de datos'),
    ('Packet Tracer','8.2','Simulador de redes');
INSERT INTO espacio_software (id_espacio, id_software)
SELECT e.id_espacio, s.id_software FROM espacio e CROSS JOIN software s;

INSERT INTO materia (nombre_materia) VALUES
    ('Programación para Internet'), ('Base de Datos II'), ('Sistemas Operativos');

INSERT INTO ciclo (nombre_ciclo, fecha_inicio, fecha_fin) VALUES ('Ciclo II 2026','2026-08-10','2026-12-11');

-- Clase institucional: lunes y miércoles 14:00-16:00 en Centro de Cómputo B
WITH h AS (
    INSERT INTO horario_clase (id_ciclo, id_usuario, id_materia, id_espacio, hora_inicio, hora_fin)
    SELECT c.id_ciclo, u.id_usuario, m.id_materia, e.id_espacio, '14:00', '16:00'
      FROM ciclo c, usuario u, materia m, espacio e
     WHERE c.nombre_ciclo='Ciclo II 2026' AND u.correo_usuario='docente1@ues.edu.sv'
       AND m.nombre_materia='Sistemas Operativos' AND e.nombre_espacio='Centro de Cómputo B'
    RETURNING id_horario
)
INSERT INTO dia_horario (id_horario, dia_semana) SELECT id_horario, d FROM h, (VALUES (1),(3)) v(d);

-- =====================================================================
-- PRUEBAS RÁPIDAS (ejecutar a mano para verificar)
-- =====================================================================
-- 1) Disponibilidad: lunes 2026-11-16 de 14:00 a 15:00 en Centro de Cómputo B
--    SELECT * FROM fn_conflictos((SELECT id_espacio FROM espacio WHERE nombre_espacio='Centro de Cómputo B'),
--                                DATE '2026-11-16', TIME '14:00', TIME '15:00');
-- 2) Aprobar dos reservas que se traslapan en el mismo espacio debe fallar con el error 23P01
--    (ex_sin_traslape_aprobadas).
-- 3) UPDATE o DELETE sobre historial_reserva debe fallar (RNF-07).
