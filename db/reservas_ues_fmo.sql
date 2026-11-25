-- Sistema de Reserva de Laboratorios y Aulas de Cómputo - UES FMO
-- Base de datos: PostgreSQL 14+

-- Se activa esta extensión para poder comparar horarios
-- y evitar que se traslapen las reservas.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Se eliminan vistas, procedimientos, funciones y tablas anteriores
-- para volver a crear todo desde cero cuando se hagan pruebas.
DROP VIEW IF EXISTS vw_incidencias_abiertas, vw_reservas_aprobadas,
    vw_equipos_estado, vw_ocupacion_espacios, vw_solicitudes_detalle CASCADE;

DROP PROCEDURE IF EXISTS sp_cerrar_incidencia(INT, INT, TEXT);
DROP PROCEDURE IF EXISTS sp_cancelar_solicitud(INT, INT, TEXT);
DROP PROCEDURE IF EXISTS sp_registrar_decision(INT, INT, VARCHAR, TEXT, INT);

DROP TABLE IF EXISTS bitacora, notificacion, uso_espacio, historial_estado,
    solicitud_excepcional, decision, cambio_solicitud, adjunto, solicitud,
    bloqueo, horario_institucional, ciclo, incidencia, equipo,
    acceso_espacio, espacio, token_correo, usuario, area_academica,
    carrera, rol, estado_solicitud CASCADE;

DROP FUNCTION IF EXISTS fn_validar_horario_solicitud() CASCADE;
DROP FUNCTION IF EXISTS fn_validar_fecha_solicitud() CASCADE;
DROP FUNCTION IF EXISTS fn_validar_max_adjuntos() CASCADE;
DROP FUNCTION IF EXISTS fn_inmutable_auditoria() CASCADE;
DROP FUNCTION IF EXISTS fn_log_historial_solicitud() CASCADE;
DROP FUNCTION IF EXISTS fn_validar_bloqueo_solicitud() CASCADE;
DROP FUNCTION IF EXISTS fn_conflictos_espacio(INT, DATE, TIME, TIME, INT);

-- 1. CATÁLOGOS BASE Y PERFILES ACADÉMICOS

-- Aquí se guardan los roles, carreras, áreas académicas
-- y los estados que se van a utilizar en las solicitudes.

CREATE TABLE rol (
    id_rol      SMALLINT PRIMARY KEY,
    nombre_rol  VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE carrera (
    id_carrera  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE area_academica (
    id_area     INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE estado_solicitud (
    id_estado      SMALLINT PRIMARY KEY,
    codigo_estado  VARCHAR(30) NOT NULL UNIQUE,
    nombre_estado  VARCHAR(50) NOT NULL UNIQUE
);

-- 2. USUARIOS Y TOKENS DE CORREO

-- Cada usuario tiene un rol y, dependiendo de este,
-- se guardan sus datos de carrera o área académica.
--
-- Estudiante: necesita carrera y no área.
-- Docente: necesita área y no carrera.
-- Encargado: no necesita ninguna de las dos.

CREATE TABLE usuario (
    id_usuario            INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_rol                SMALLINT     NOT NULL REFERENCES rol(id_rol),
    nombre                VARCHAR(100) NOT NULL,
    correo_institucional  VARCHAR(120) NOT NULL,
    contrasena_hash       VARCHAR(255) NOT NULL,
    estado_cuenta         VARCHAR(30)  NOT NULL DEFAULT 'pendiente_verificacion'
        CHECK (estado_cuenta IN ('pendiente_verificacion', 'activa', 'desactivada')),
    id_carrera            INT          REFERENCES carrera(id_carrera),
    id_area               INT          REFERENCES area_academica(id_area),
    creado_en             TIMESTAMP    NOT NULL DEFAULT now(),

    CONSTRAINT ck_usuario_perfil_rol CHECK (
        (id_rol = 1 AND id_carrera IS NOT NULL AND id_area IS NULL) OR -- Estudiante
        (id_rol = 2 AND id_area IS NOT NULL AND id_carrera IS NULL) OR -- Docente
        (id_rol = 3 AND id_carrera IS NULL AND id_area IS NULL)        -- Encargado
    )
);

-- Se evita que dos usuarios se registren con el mismo correo,
-- aunque lo escriban con mayúsculas o minúsculas.
CREATE UNIQUE INDEX ux_usuario_correo ON usuario (lower(correo_institucional));

-- Aquí se guardan los códigos para verificar el correo
-- o recuperar la contraseña de un usuario.
CREATE TABLE token_correo (
    id_token      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario    INT          NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    tipo          VARCHAR(30)  NOT NULL CHECK (tipo IN ('verificacion', 'recuperacion')),
    codigo        VARCHAR(100) NOT NULL,
    fecha_expira  TIMESTAMP    NOT NULL,
    usado         BOOLEAN      NOT NULL DEFAULT FALSE,
    creado_en     TIMESTAMP    NOT NULL DEFAULT now()
);


-- =====================================================================
-- 3. ESPACIOS, ACCESOS, EQUIPOS E INCIDENCIAS
-- =====================================================================

-- Se registran los laboratorios y aulas de cómputo
-- que se podrán reservar dentro del sistema.
CREATE TABLE espacio (
    id_espacio    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre        VARCHAR(100) NOT NULL UNIQUE,
    tipo          VARCHAR(30)  NOT NULL CHECK (tipo IN ('laboratorio', 'aula_computo')),
    ubicacion     VARCHAR(150) NOT NULL,
    capacidad     INT          NOT NULL CHECK (capacidad > 0),
    estado        VARCHAR(20)  NOT NULL DEFAULT 'activo'
        CHECK (estado IN ('activo', 'desactivado')),
    id_encargado  INT          NOT NULL REFERENCES usuario(id_usuario)
);

-- Se indica qué carreras o áreas académicas pueden utilizar
-- cada espacio. Solo se permite una de las dos por registro.
CREATE TABLE acceso_espacio (
    id_acceso   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_espacio  INT NOT NULL REFERENCES espacio(id_espacio) ON DELETE CASCADE,
    id_carrera  INT REFERENCES carrera(id_carrera),
    id_area     INT REFERENCES area_academica(id_area),

    CONSTRAINT ck_acceso_uno_solo CHECK (
        (id_carrera IS NOT NULL AND id_area IS NULL) OR
        (id_area IS NOT NULL AND id_carrera IS NULL)
    )
);

-- No se repite el mismo acceso para un espacio y una carrera.
CREATE UNIQUE INDEX ux_acceso_espacio_carrera
    ON acceso_espacio (id_espacio, id_carrera) WHERE id_carrera IS NOT NULL;

-- No se repite el mismo acceso para un espacio y un área.
CREATE UNIQUE INDEX ux_acceso_espacio_area
    ON acceso_espacio (id_espacio, id_area) WHERE id_area IS NOT NULL;

-- Se guarda el equipo que tiene cada espacio
-- y se indica si está disponible o tiene algún problema.
CREATE TABLE equipo (
    id_equipo   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_espacio  INT          NOT NULL REFERENCES espacio(id_espacio) ON DELETE CASCADE,
    nombre      VARCHAR(100) NOT NULL,
    estado      VARCHAR(20)  NOT NULL DEFAULT 'disponible'
        CHECK (estado IN ('disponible', 'danado', 'fuera_de_servicio')),
    UNIQUE (id_espacio, nombre)
);

-- Aquí se reportan los problemas que tengan los equipos,
-- quién los reportó y si ya fueron solucionados.
CREATE TABLE incidencia (
    id_incidencia   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_equipo       INT          NOT NULL REFERENCES equipo(id_equipo),
    id_reporta      INT          NOT NULL REFERENCES usuario(id_usuario),
    descripcion     TEXT         NOT NULL CHECK (length(trim(descripcion)) > 0),
    fecha_reporte   TIMESTAMP    NOT NULL DEFAULT now(),
    estado          VARCHAR(20)  NOT NULL DEFAULT 'abierta'
        CHECK (estado IN ('abierta', 'resuelta')),
    solucion        TEXT,
    fecha_solucion  TIMESTAMP,

    CONSTRAINT ck_incidencia_solucion CHECK (
        estado <> 'resuelta' OR length(trim(coalesce(solucion, ''))) > 0
    )
);

-- 4. CICLOS, HORARIOS INSTITUCIONALES Y BLOQUEOS

-- Se guardan los ciclos académicos con sus fechas.
CREATE TABLE ciclo (
    id_ciclo      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre        VARCHAR(50) NOT NULL UNIQUE,
    fecha_inicio  DATE        NOT NULL,
    fecha_fin     DATE        NOT NULL,
    CHECK (fecha_fin > fecha_inicio)
);

-- Se registran las clases que ya están programadas
-- en cada espacio durante un ciclo académico.
CREATE TABLE horario_institucional (
    id_horario       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_ciclo         INT          NOT NULL REFERENCES ciclo(id_ciclo),
    id_espacio       INT          NOT NULL REFERENCES espacio(id_espacio),
    dia_semana       VARCHAR(15)  NOT NULL
        CHECK (dia_semana IN ('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado')),
    hora_inicio      TIME         NOT NULL,
    hora_fin         TIME         NOT NULL,
    asignatura       VARCHAR(120) NOT NULL,
    docente_titular  VARCHAR(100) NOT NULL,
    CHECK (hora_fin > hora_inicio)
);

-- Se pueden bloquear espacios cuando no se puedan utilizar,
-- por ejemplo, cuando haya mantenimiento.
CREATE TABLE bloqueo (
    id_bloqueo  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_espacio  INT          NOT NULL REFERENCES espacio(id_espacio),
    id_creador  INT          NOT NULL REFERENCES usuario(id_usuario),
    motivo      VARCHAR(200) NOT NULL CHECK (length(trim(motivo)) > 0),
    inicio      TIMESTAMP    NOT NULL,
    fin         TIMESTAMP    NOT NULL,
    activo      BOOLEAN      NOT NULL DEFAULT TRUE,

    CHECK (fin > inicio),
    -- Evita que existan bloqueos activos traslapados en un espacio.
    EXCLUDE USING gist (id_espacio WITH =, tsrange(inicio, fin) WITH &&)
        WHERE (activo)
);

-- 5. SOLICITUDES, ADJUNTOS, CAMBIOS, DECISIONES Y EXCEPCIONES

-- Estados de las solicitudes:
-- 1 = pendiente de revisión
-- 2 = en revisión
-- 3 = aprobada
-- 4 = rechazada
-- 5 = cancelada

-- Aquí se guardan las reservas que realizan los usuarios.
CREATE TABLE solicitud (
    id_solicitud         INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_solicitante       INT          NOT NULL REFERENCES usuario(id_usuario),
    id_espacio           INT          NOT NULL REFERENCES espacio(id_espacio),
    id_carrera           INT          REFERENCES carrera(id_carrera),
    fecha                DATE         NOT NULL,
    hora_inicio          TIME         NOT NULL,
    hora_fin             TIME         NOT NULL,
    asignatura           VARCHAR(120) NOT NULL,
    docente_responsable  VARCHAR(100) NOT NULL,
    participantes        INT          NOT NULL CHECK (participantes > 0),
    motivo               TEXT         NOT NULL CHECK (length(trim(motivo)) > 0),
    tipo                 VARCHAR(20)  NOT NULL DEFAULT 'ordinaria'
        CHECK (tipo IN ('ordinaria', 'excepcional')),
    id_estado            SMALLINT     NOT NULL DEFAULT 1 REFERENCES estado_solicitud(id_estado),
    fecha_registro       TIMESTAMP    NOT NULL DEFAULT now(),

    -- Se calcula el período de la solicitud usando la fecha y las horas.
    periodo TSRANGE GENERATED ALWAYS AS
        (tsrange(fecha + hora_inicio, fecha + hora_fin)) STORED,

    CHECK (hora_fin > hora_inicio),

    -- No se permiten dos reservas aprobadas traslapadas
    -- en el mismo espacio.
    CONSTRAINT ex_sin_traslape_aprobadas
        EXCLUDE USING gist (id_espacio WITH =, periodo WITH &&) WHERE (id_estado = 3)
);

-- Se guardan los documentos que se agreguen a una solicitud.
CREATE TABLE adjunto (
    id_adjunto      INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_solicitud    INT          NOT NULL REFERENCES solicitud(id_solicitud) ON DELETE CASCADE,
    nombre_archivo  VARCHAR(150) NOT NULL,
    formato         VARCHAR(10)  NOT NULL CHECK (formato IN ('pdf', 'jpg', 'png')),
    tamano_bytes    INT          NOT NULL CHECK (tamano_bytes > 0 AND tamano_bytes <= 5242880),
    ruta            VARCHAR(255) NOT NULL
);

-- Se comprueba que no se agreguen más de 3 archivos
-- a una misma solicitud.
CREATE FUNCTION fn_validar_max_adjuntos() RETURNS trigger AS $$
DECLARE
    v_total INT;
BEGIN
    SELECT COUNT(*) INTO v_total
      FROM adjunto
     WHERE id_solicitud = NEW.id_solicitud;

    IF v_total >= 3 THEN
        RAISE EXCEPTION 'Una solicitud admite como máximo 3 archivos adjuntos';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Se ejecuta la validación antes de agregar un archivo.
CREATE TRIGGER trg_adjunto_max_tres
    BEFORE INSERT ON adjunto
    FOR EACH ROW EXECUTE FUNCTION fn_validar_max_adjuntos();

-- Se comprueba que al crear o reprogramar una solicitud no se elijan
-- fechas pasadas, domingos ni horas que ya pasaron hoy.
CREATE FUNCTION fn_validar_fecha_solicitud() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' OR NEW.fecha IS DISTINCT FROM OLD.fecha OR NEW.hora_inicio IS DISTINCT FROM OLD.hora_inicio THEN
        IF NEW.fecha < CURRENT_DATE THEN
            RAISE EXCEPTION 'No se permiten reservas en fechas pasadas';
        END IF;

        IF EXTRACT(ISODOW FROM NEW.fecha) = 7 THEN
            RAISE EXCEPTION 'No se permiten reservas los domingos';
        END IF;

        IF NEW.fecha = CURRENT_DATE AND NEW.hora_inicio <= LOCALTIME THEN
            RAISE EXCEPTION 'La hora de inicio ya ha pasado';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Se ejecuta la validación de fecha y día antes de insertar o actualizar.
CREATE TRIGGER trg_solicitud_validar_fecha
    BEFORE INSERT OR UPDATE ON solicitud
    FOR EACH ROW EXECUTE FUNCTION fn_validar_fecha_solicitud();

-- Se comprueba que el horario solicitado no choque con una clase
-- ordinaria registrada en el ciclo vigente para ese espacio.
CREATE FUNCTION fn_validar_horario_solicitud() RETURNS trigger AS $$
DECLARE
    v_dia VARCHAR(15);
BEGIN
    v_dia := CASE EXTRACT(ISODOW FROM NEW.fecha)::INT
        WHEN 1 THEN 'lunes'
        WHEN 2 THEN 'martes'
        WHEN 3 THEN 'miercoles'
        WHEN 4 THEN 'jueves'
        WHEN 5 THEN 'viernes'
        WHEN 6 THEN 'sabado'
        ELSE 'domingo'
    END;

    IF EXISTS (
        SELECT 1
          FROM horario_institucional h
          JOIN ciclo c ON c.id_ciclo = h.id_ciclo
         WHERE h.id_espacio = NEW.id_espacio
           AND NEW.fecha BETWEEN c.fecha_inicio AND c.fecha_fin
           AND h.dia_semana = v_dia
           AND NEW.hora_inicio < h.hora_fin
           AND NEW.hora_fin > h.hora_inicio
    ) THEN
        RAISE EXCEPTION 'El espacio tiene una clase programada en ese horario';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Se ejecuta la validación de horario institucional antes de guardar.
CREATE TRIGGER trg_solicitud_validar_horario
    BEFORE INSERT OR UPDATE ON solicitud
    FOR EACH ROW EXECUTE FUNCTION fn_validar_horario_solicitud();

-- Se guardan los cambios de horario que solicite un usuario.
CREATE TABLE cambio_solicitud (
    id_cambio          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_solicitud       INT         NOT NULL REFERENCES solicitud(id_solicitud) ON DELETE CASCADE,
    nueva_fecha        DATE        NOT NULL,
    nueva_hora_inicio  TIME        NOT NULL,
    nueva_hora_fin     TIME        NOT NULL,
    estado             VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
    fecha_solicitud    TIMESTAMP   NOT NULL DEFAULT now(),
    CHECK (nueva_hora_fin > nueva_hora_inicio)
);

-- Se registra la decisión del encargado sobre una solicitud
-- o sobre un cambio de horario.
CREATE TABLE decision (
    id_decision    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_solicitud   INT         NOT NULL REFERENCES solicitud(id_solicitud),
    id_cambio      INT         REFERENCES cambio_solicitud(id_cambio),
    tipo_decision  VARCHAR(20) NOT NULL
        CHECK (tipo_decision IN ('solicitud_inicial', 'cambio_horario')),
    id_encargado   INT         NOT NULL REFERENCES usuario(id_usuario),
    resultado      VARCHAR(20) NOT NULL CHECK (resultado IN ('aprobada', 'rechazada')),
    motivo         TEXT,
    fecha_hora     TIMESTAMP   NOT NULL DEFAULT now(),

    -- Se comprueba que el tipo de decisión corresponda
    -- con el registro que se está evaluando.
    CONSTRAINT ck_decision_tipo_cambio CHECK (
        (tipo_decision = 'solicitud_inicial' AND id_cambio IS NULL) OR
        (tipo_decision = 'cambio_horario' AND id_cambio IS NOT NULL)
    ),

    -- Si se rechaza una solicitud, debe indicarse el motivo.
    CONSTRAINT ck_decision_rechazo_motivo CHECK (
        resultado <> 'rechazada' OR length(trim(coalesce(motivo, ''))) > 0
    )
);

-- Cada cambio de horario solo puede tener una decisión.
CREATE UNIQUE INDEX ux_decision_unica_por_cambio
    ON decision (id_cambio) WHERE id_cambio IS NOT NULL;

-- Se guarda la información de las solicitudes excepcionales
-- que necesitan una autorización especial.
CREATE TABLE solicitud_excepcional (
    id_solicitud           INT          PRIMARY KEY REFERENCES solicitud(id_solicitud) ON DELETE CASCADE,
    autoridad_nombre       VARCHAR(100) NOT NULL,
    autoridad_cargo        VARCHAR(100) NOT NULL,
    justificacion          TEXT         NOT NULL CHECK (length(trim(justificacion)) > 0),
    id_solicitud_afectada  INT          REFERENCES solicitud(id_solicitud),
    alternativa_ofrecida   VARCHAR(200),

    -- La solicitud excepcional no puede señalarse a sí misma.
    CONSTRAINT ck_excepcional_distinta_solicitud CHECK (
        id_solicitud_afectada IS NULL OR id_solicitud_afectada <> id_solicitud
    )
);

-- 6. HISTORIAL DE ESTADOS, USO DEL ESPACIO, NOTIFICACIONES Y BITÁCORA

-- Se guarda cada cambio de estado que tenga una solicitud.
CREATE TABLE historial_estado (
    id_historial    INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_solicitud    INT       NOT NULL REFERENCES solicitud(id_solicitud),
    id_usuario      INT       NOT NULL REFERENCES usuario(id_usuario),
    estado_anterior SMALLINT  REFERENCES estado_solicitud(id_estado),
    estado_nuevo    SMALLINT  NOT NULL REFERENCES estado_solicitud(id_estado),
    motivo          TEXT,
    fecha_hora      TIMESTAMP NOT NULL DEFAULT now()
);

-- Se registra el uso del espacio y las observaciones del encargado.
CREATE TABLE uso_espacio (
    id_uso          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_solicitud    INT       NOT NULL REFERENCES solicitud(id_solicitud),
    id_encargado    INT       NOT NULL REFERENCES usuario(id_usuario),
    observacion     TEXT,
    fecha_registro  TIMESTAMP NOT NULL DEFAULT now()
);

-- Se guardan las notificaciones que se envían a los usuarios.
CREATE TABLE notificacion (
    id_notificacion  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario       INT          NOT NULL REFERENCES usuario(id_usuario),
    id_solicitud     INT          REFERENCES solicitud(id_solicitud),
    tipo             VARCHAR(30)  NOT NULL
        CHECK (tipo IN ('resultado', 'cambio', 'cancelacion', 'recordatorio', 'verificacion', 'recuperacion')),
    asunto           VARCHAR(150) NOT NULL,
    fecha_envio      TIMESTAMP    NOT NULL DEFAULT now(),
    estado_envio     VARCHAR(20)  NOT NULL DEFAULT 'enviada'
        CHECK (estado_envio IN ('enviada', 'fallida'))
);

-- La bitácora guarda las acciones importantes que se realizan
-- dentro del sistema.
CREATE TABLE bitacora (
    id_bitacora  INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    id_usuario   INT         NOT NULL REFERENCES usuario(id_usuario),
    accion       VARCHAR(60) NOT NULL,
    entidad      VARCHAR(40) NOT NULL,
    id_entidad   INT,
    fecha_hora   TIMESTAMP   NOT NULL DEFAULT now()
);

-- Esta función evita que se modifiquen o eliminen
-- los registros del historial y la bitácora.
CREATE FUNCTION fn_inmutable_auditoria() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Registro inmutable: no se permite % en %', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

-- Se bloquean los cambios y eliminaciones del historial.
CREATE TRIGGER trg_historial_no_mod
    BEFORE UPDATE OR DELETE ON historial_estado
    FOR EACH ROW EXECUTE FUNCTION fn_inmutable_auditoria();

-- También se evita eliminar todos los registros del historial.
CREATE TRIGGER trg_historial_no_trunc
    BEFORE TRUNCATE ON historial_estado
    FOR EACH STATEMENT EXECUTE FUNCTION fn_inmutable_auditoria();

-- Se bloquean los cambios y eliminaciones de la bitácora.
CREATE TRIGGER trg_bitacora_no_mod
    BEFORE UPDATE OR DELETE ON bitacora
    FOR EACH ROW EXECUTE FUNCTION fn_inmutable_auditoria();

-- También se evita eliminar todos los registros de la bitácora.
CREATE TRIGGER trg_bitacora_no_trunc
    BEFORE TRUNCATE ON bitacora
    FOR EACH STATEMENT EXECUTE FUNCTION fn_inmutable_auditoria();

-- Cuando se crea una solicitud o cambia su estado,
-- se agrega automáticamente un registro al historial.
-- El backend puede indicar qué usuario realizó el cambio
-- usando SET LOCAL app.id_usuario dentro de la transacción.
CREATE FUNCTION fn_log_historial_solicitud() RETURNS trigger AS $$
DECLARE
    v_user INT;
BEGIN
    v_user := COALESCE(NULLIF(current_setting('app.id_usuario', true), '')::INT, NEW.id_solicitante);

    IF TG_OP = 'INSERT' THEN
        INSERT INTO historial_estado (id_solicitud, id_usuario, estado_anterior, estado_nuevo, motivo)
        VALUES (NEW.id_solicitud, v_user, NULL, NEW.id_estado, NULL);
    ELSIF NEW.id_estado IS DISTINCT FROM OLD.id_estado THEN
        INSERT INTO historial_estado (id_solicitud, id_usuario, estado_anterior, estado_nuevo, motivo)
        VALUES (NEW.id_solicitud, v_user, OLD.id_estado, NEW.id_estado, NULL);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Se registra el estado inicial cuando se crea una solicitud.
CREATE TRIGGER trg_solicitud_historial_ins
    AFTER INSERT ON solicitud
    FOR EACH ROW EXECUTE FUNCTION fn_log_historial_solicitud();

-- Se registra en el historial cuando cambia el estado.
CREATE TRIGGER trg_solicitud_historial_upd
    AFTER UPDATE ON solicitud
    FOR EACH ROW EXECUTE FUNCTION fn_log_historial_solicitud();

-- Antes de aprobar una solicitud, se revisa que el espacio
-- no tenga un bloqueo activo durante ese horario.
CREATE FUNCTION fn_validar_bloqueo_solicitud() RETURNS trigger AS $$
BEGIN
    IF NEW.id_estado = 3 AND EXISTS (
        SELECT 1
          FROM bloqueo b
         WHERE b.id_espacio = NEW.id_espacio
           AND b.activo
           AND tsrange(b.inicio, b.fin) &&
               tsrange(NEW.fecha + NEW.hora_inicio, NEW.fecha + NEW.hora_fin)
    ) THEN
        RAISE EXCEPTION 'No se puede aprobar: el espacio tiene un bloqueo activo en ese horario';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Se ejecuta la validación al crear o actualizar una solicitud.
CREATE TRIGGER trg_solicitud_validar_bloqueo
    BEFORE INSERT OR UPDATE ON solicitud
    FOR EACH ROW EXECUTE FUNCTION fn_validar_bloqueo_solicitud();

-- 7. VISTAS PARA CONSULTAS DESDE EL CÓDIGO

-- Muestra cada solicitud junto con los nombres legibles del usuario,
-- espacio, carrera y estado para evitar repetir JOIN en el backend.
CREATE OR REPLACE VIEW vw_solicitudes_detalle AS
SELECT
    s.id_solicitud,
    s.tipo,
    s.id_estado,
    es.codigo_estado,
    es.nombre_estado,
    s.fecha,
    s.hora_inicio,
    s.hora_fin,
    s.asignatura,
    s.docente_responsable,
    s.participantes,
    s.motivo,
    s.fecha_registro,
    s.id_solicitante,
    u.nombre AS nombre_solicitante,
    u.correo_institucional,
    s.id_espacio,
    e.nombre AS nombre_espacio,
    e.tipo AS tipo_espacio,
    e.ubicacion AS ubicacion_espacio,
    e.capacidad AS capacidad_espacio,
    e.id_encargado,
    s.id_carrera,
    c.nombre AS nombre_carrera
FROM solicitud s
JOIN estado_solicitud es ON es.id_estado = s.id_estado
JOIN usuario u          ON u.id_usuario = s.id_solicitante
JOIN espacio e          ON e.id_espacio = s.id_espacio
LEFT JOIN carrera c     ON c.id_carrera = s.id_carrera;

-- Muestra únicamente las solicitudes aprobadas con su detalle
-- para consultas rápidas de reservas confirmadas.
CREATE OR REPLACE VIEW vw_reservas_aprobadas AS
SELECT *
FROM vw_solicitudes_detalle
WHERE id_estado = 3;

-- Reúne en una sola consulta las ocupaciones de un espacio:
-- reservas aprobadas, bloqueos activos y horarios institucionales del ciclo.
CREATE OR REPLACE VIEW vw_ocupacion_espacios AS
SELECT
    s.id_espacio,
    e.nombre AS nombre_espacio,
    'reserva_aprobada'::TEXT AS tipo_ocupacion,
    s.fecha AS fecha_inicio_dia,
    s.fecha AS fecha_fin_dia,
    NULL::VARCHAR(15) AS dia_semana,
    s.hora_inicio,
    s.hora_fin,
    s.asignatura AS detalle,
    s.id_solicitud AS id_referencia
FROM solicitud s
JOIN espacio e ON e.id_espacio = s.id_espacio
WHERE s.id_estado = 3

UNION ALL

SELECT
    b.id_espacio,
    e.nombre AS nombre_espacio,
    'bloqueo'::TEXT AS tipo_ocupacion,
    b.inicio::DATE AS fecha_inicio_dia,
    b.fin::DATE AS fecha_fin_dia,
    NULL::VARCHAR(15) AS dia_semana,
    b.inicio::TIME AS hora_inicio,
    b.fin::TIME AS hora_fin,
    b.motivo AS detalle,
    b.id_bloqueo AS id_referencia
FROM bloqueo b
JOIN espacio e ON e.id_espacio = b.id_espacio
WHERE b.activo = TRUE

UNION ALL

SELECT
    h.id_espacio,
    e.nombre AS nombre_espacio,
    'horario_institucional'::TEXT AS tipo_ocupacion,
    ci.fecha_inicio AS fecha_inicio_dia,
    ci.fecha_fin AS fecha_fin_dia,
    h.dia_semana,
    h.hora_inicio,
    h.hora_fin,
    h.asignatura || ' (' || h.docente_titular || ')' AS detalle,
    h.id_horario AS id_referencia
FROM horario_institucional h
JOIN espacio e ON e.id_espacio = h.id_espacio
JOIN ciclo ci  ON ci.id_ciclo = h.id_ciclo;

-- Muestra cada equipo con su espacio y cuántas incidencias
-- abiertas tiene actualmente.
CREATE OR REPLACE VIEW vw_equipos_estado AS
SELECT
    eq.id_equipo,
    eq.id_espacio,
    esp.nombre AS nombre_espacio,
    eq.nombre AS nombre_equipo,
    eq.estado AS estado_equipo,
    COUNT(inc.id_incidencia) FILTER (WHERE inc.estado = 'abierta') AS incidencias_abiertas
FROM equipo eq
JOIN espacio esp       ON esp.id_espacio = eq.id_espacio
LEFT JOIN incidencia inc ON inc.id_equipo = eq.id_equipo
GROUP BY eq.id_equipo, eq.id_espacio, esp.nombre, eq.nombre, eq.estado;

-- Lista las incidencias abiertas junto con el equipo, el espacio
-- y el usuario que realizó el reporte.
CREATE OR REPLACE VIEW vw_incidencias_abiertas AS
SELECT
    inc.id_incidencia,
    inc.fecha_reporte,
    inc.descripcion,
    inc.estado,
    inc.id_equipo,
    eq.nombre AS nombre_equipo,
    eq.estado AS estado_equipo,
    eq.id_espacio,
    esp.nombre AS nombre_espacio,
    inc.id_reporta,
    u.nombre AS reportado_por
FROM incidencia inc
JOIN equipo eq  ON eq.id_equipo = inc.id_equipo
JOIN espacio esp ON esp.id_espacio = eq.id_espacio
JOIN usuario u   ON u.id_usuario = inc.id_reporta
WHERE inc.estado = 'abierta';

-- 8. FUNCIONES Y PROCEDIMIENTOS DE APOYO

-- Busca conflictos de horario para un espacio en una fecha y rango:
-- reservas aprobadas, bloqueos activos y clases del ciclo vigente.
CREATE FUNCTION fn_conflictos_espacio(
    p_id_espacio INT,
    p_fecha DATE,
    p_hora_inicio TIME,
    p_hora_fin TIME,
    p_excluir_solicitud INT DEFAULT NULL
)
RETURNS TABLE (
    tipo_conflicto TEXT,
    id_referencia INT,
    detalle TEXT,
    inicio TIMESTAMP,
    fin TIMESTAMP
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        'reserva_aprobada'::TEXT,
        s.id_solicitud,
        ('Reserva aprobada: ' || s.asignatura)::TEXT,
        (s.fecha + s.hora_inicio)::TIMESTAMP,
        (s.fecha + s.hora_fin)::TIMESTAMP
    FROM solicitud s
    WHERE s.id_espacio = p_id_espacio
      AND s.id_estado = 3
      AND s.fecha = p_fecha
      AND s.id_solicitud IS DISTINCT FROM p_excluir_solicitud
      AND p_hora_inicio < s.hora_fin
      AND p_hora_fin > s.hora_inicio

    UNION ALL

    SELECT
        'bloqueo'::TEXT,
        b.id_bloqueo,
        ('Bloqueo: ' || b.motivo)::TEXT,
        b.inicio,
        b.fin
    FROM bloqueo b
    WHERE b.id_espacio = p_id_espacio
      AND b.activo = TRUE
      AND tsrange(b.inicio, b.fin) && tsrange(p_fecha + p_hora_inicio, p_fecha + p_hora_fin)

    UNION ALL

    SELECT
        'horario_institucional'::TEXT,
        h.id_horario,
        ('Clase: ' || h.asignatura || ' - ' || h.docente_titular)::TEXT,
        (p_fecha + h.hora_inicio)::TIMESTAMP,
        (p_fecha + h.hora_fin)::TIMESTAMP
    FROM horario_institucional h
    JOIN ciclo c ON c.id_ciclo = h.id_ciclo
    WHERE h.id_espacio = p_id_espacio
      AND p_fecha BETWEEN c.fecha_inicio AND c.fecha_fin
      AND h.dia_semana = CASE EXTRACT(ISODOW FROM p_fecha)::INT
          WHEN 1 THEN 'lunes'
          WHEN 2 THEN 'martes'
          WHEN 3 THEN 'miercoles'
          WHEN 4 THEN 'jueves'
          WHEN 5 THEN 'viernes'
          WHEN 6 THEN 'sabado'
          ELSE 'domingo'
      END
      AND p_hora_inicio < h.hora_fin
      AND p_hora_fin > h.hora_inicio;
$$;

-- Registra la decisión del encargado sobre una solicitud inicial
-- o sobre un cambio de horario, y actualiza los estados correspondientes.
CREATE PROCEDURE sp_registrar_decision(
    p_id_solicitud INT,
    p_id_encargado INT,
    p_resultado VARCHAR(20),
    p_motivo TEXT DEFAULT NULL,
    p_id_cambio INT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_tipo_decision VARCHAR(20);
    v_cambio RECORD;
BEGIN
    IF p_resultado NOT IN ('aprobada', 'rechazada') THEN
        RAISE EXCEPTION 'Resultado inválido: %', p_resultado;
    END IF;

    IF p_resultado = 'rechazada' AND length(trim(coalesce(p_motivo, ''))) = 0 THEN
        RAISE EXCEPTION 'El motivo es obligatorio cuando la decisión es rechazada';
    END IF;

    PERFORM set_config('app.id_usuario', p_id_encargado::TEXT, true);

    IF p_id_cambio IS NULL THEN
        v_tipo_decision := 'solicitud_inicial';

        INSERT INTO decision (
            id_solicitud, id_cambio, tipo_decision, id_encargado, resultado, motivo
        ) VALUES (
            p_id_solicitud, NULL, v_tipo_decision, p_id_encargado, p_resultado, p_motivo
        );

        UPDATE solicitud
           SET id_estado = CASE WHEN p_resultado = 'aprobada' THEN 3 ELSE 4 END
         WHERE id_solicitud = p_id_solicitud;
    ELSE
        v_tipo_decision := 'cambio_horario';

        SELECT * INTO v_cambio
          FROM cambio_solicitud
         WHERE id_cambio = p_id_cambio
           AND id_solicitud = p_id_solicitud;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'El cambio % no pertenece a la solicitud %', p_id_cambio, p_id_solicitud;
        END IF;

        INSERT INTO decision (
            id_solicitud, id_cambio, tipo_decision, id_encargado, resultado, motivo
        ) VALUES (
            p_id_solicitud, p_id_cambio, v_tipo_decision, p_id_encargado, p_resultado, p_motivo
        );

        IF p_resultado = 'aprobada' THEN
            UPDATE cambio_solicitud
               SET estado = 'aprobado'
             WHERE id_cambio = p_id_cambio;

            UPDATE solicitud
               SET fecha = v_cambio.nueva_fecha,
                   hora_inicio = v_cambio.nueva_hora_inicio,
                   hora_fin = v_cambio.nueva_hora_fin,
                   id_estado = 3
             WHERE id_solicitud = p_id_solicitud;
        ELSE
            UPDATE cambio_solicitud
               SET estado = 'rechazado'
             WHERE id_cambio = p_id_cambio;
        END IF;
    END IF;
END;
$$;

-- Cancela una solicitud que aún esté pendiente o aprobada,
-- validando que el usuario que cancela sea el solicitante y la fecha no haya pasado.
CREATE PROCEDURE sp_cancelar_solicitud(
    p_id_solicitud INT,
    p_id_usuario INT,
    p_motivo TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_sol RECORD;
BEGIN
    SELECT id_solicitante, id_estado, fecha
      INTO v_sol
      FROM solicitud
     WHERE id_solicitud = p_id_solicitud;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La solicitud % no existe', p_id_solicitud;
    END IF;

    IF v_sol.id_solicitante <> p_id_usuario THEN
        RAISE EXCEPTION 'El usuario % no es el solicitante de la solicitud %', p_id_usuario, p_id_solicitud;
    END IF;

    IF v_sol.id_estado NOT IN (1, 2, 3) THEN
        RAISE EXCEPTION 'La solicitud % no puede cancelarse en su estado actual (%)', p_id_solicitud, v_sol.id_estado;
    END IF;

    IF v_sol.fecha < CURRENT_DATE THEN
        RAISE EXCEPTION 'No se puede cancelar la solicitud % porque su fecha (%) ya pasó', p_id_solicitud, v_sol.fecha;
    END IF;

    PERFORM set_config('app.id_usuario', p_id_usuario::TEXT, true);

    UPDATE solicitud
       SET id_estado = 5
     WHERE id_solicitud = p_id_solicitud;

    IF length(trim(coalesce(p_motivo, ''))) > 0 THEN
        INSERT INTO bitacora (id_usuario, accion, entidad, id_entidad)
        VALUES (p_id_usuario, 'CANCELAR_SOLICITUD: ' || left(trim(p_motivo), 40), 'solicitud', p_id_solicitud);
    END IF;
END;
$$;

-- Marca una incidencia abierta como resuelta exigiendo una solución
-- y actualizando el estado del equipo si se indica.
CREATE PROCEDURE sp_cerrar_incidencia(
    p_id_incidencia INT,
    p_id_usuario INT,
    p_solucion TEXT,
    p_nuevo_estado_equipo VARCHAR(20) DEFAULT 'disponible'
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_inc RECORD;
BEGIN
    IF length(trim(coalesce(p_solucion, ''))) = 0 THEN
        RAISE EXCEPTION 'Debe indicar la solución para cerrar la incidencia %', p_id_incidencia;
    END IF;

    IF p_nuevo_estado_equipo NOT IN ('disponible', 'danado', 'fuera_de_servicio') THEN
        RAISE EXCEPTION 'Estado de equipo inválido: %', p_nuevo_estado_equipo;
    END IF;

    SELECT id_incidencia, id_equipo, estado
      INTO v_inc
      FROM incidencia
     WHERE id_incidencia = p_id_incidencia;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'La incidencia % no existe', p_id_incidencia;
    END IF;

    IF v_inc.estado = 'resuelta' THEN
        RAISE EXCEPTION 'La incidencia % ya está resuelta', p_id_incidencia;
    END IF;

    UPDATE incidencia
       SET estado = 'resuelta',
           solucion = trim(p_solucion),
           fecha_solucion = now()
     WHERE id_incidencia = p_id_incidencia;

    UPDATE equipo
       SET estado = p_nuevo_estado_equipo
     WHERE id_equipo = v_inc.id_equipo;

    INSERT INTO bitacora (id_usuario, accion, entidad, id_entidad)
    VALUES (p_id_usuario, 'CERRAR_INCIDENCIA', 'incidencia', p_id_incidencia);
END;
$$;

-- 9. ÍNDICES

-- Se crean índices para que las búsquedas más comunes
-- dentro del sistema sean más rápidas.

CREATE INDEX ix_solicitud_espacio_fecha ON solicitud (id_espacio, fecha);
CREATE INDEX ix_solicitud_solicitante   ON solicitud (id_solicitante);
CREATE INDEX ix_solicitud_estado        ON solicitud (id_estado);
CREATE INDEX ix_horario_espacio_ciclo   ON horario_institucional (id_espacio, id_ciclo);
CREATE INDEX ix_historial_solicitud     ON historial_estado (id_solicitud);
CREATE INDEX ix_bitacora_usuario_fecha  ON bitacora (id_usuario, fecha_hora);
CREATE INDEX ix_notificacion_usuario    ON notificacion (id_usuario, fecha_envio);


-- 10. DATOS INICIALES

-- Se agregan los roles que utilizará el sistema.
INSERT INTO rol (id_rol, nombre_rol) VALUES
    (1, 'estudiante'),
    (2, 'docente'),
    (3, 'encargado');

-- Se agregan los estados que pueden tener las solicitudes.
INSERT INTO estado_solicitud (id_estado, codigo_estado, nombre_estado) VALUES
    (1, 'pendiente_revision', 'Pendiente de revisión'),
    (2, 'en_revision',        'En revisión'),
    (3, 'aprobada',           'Aprobada'),
    (4, 'rechazada',          'Rechazada'),
    (5, 'cancelada',          'Cancelada');