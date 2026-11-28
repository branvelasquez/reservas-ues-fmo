using Microsoft.EntityFrameworkCore;
using ReservasApi.Models;

namespace ReservasApi.Data;

public class ReservasDbContext : DbContext
{
    public ReservasDbContext(DbContextOptions<ReservasDbContext> options) : base(options)
    {
    }

    //Catálogos base
    public DbSet<RolModel> Roles => Set<RolModel>();
    public DbSet<CarreraModel> Carreras => Set<CarreraModel>();
    public DbSet<AreaAcademicaModel> AreasAcademicas => Set<AreaAcademicaModel>();
    public DbSet<EstadoSolicitudModel> EstadosSolicitud => Set<EstadoSolicitudModel>();

    //Usuarios y tokens de correo
    public DbSet<UsuarioModel> Usuarios => Set<UsuarioModel>();
    public DbSet<TokenCorreoModel> TokensCorreo => Set<TokenCorreoModel>();

    //Espacios, accesos, equipos e incidencias
    public DbSet<EspacioModel> Espacios => Set<EspacioModel>();
    public DbSet<AccesoEspacioModel> AccesosEspacio => Set<AccesoEspacioModel>();
    public DbSet<EquipoModel> Equipos => Set<EquipoModel>();
    public DbSet<IncidenciaModel> Incidencias => Set<IncidenciaModel>();

    //Ciclos, horarios institucionales y bloqueos
    public DbSet<CicloModel> Ciclos => Set<CicloModel>();
    public DbSet<HorarioInstitucionalModel> HorariosInstitucionales => Set<HorarioInstitucionalModel>();
    public DbSet<BloqueoModel> Bloqueos => Set<BloqueoModel>();

    //Solicitudes, adjuntos, cambios, decisiones y excepciones
    public DbSet<SolicitudModel> Solicitudes => Set<SolicitudModel>();
    public DbSet<AdjuntoModel> Adjuntos => Set<AdjuntoModel>();
    public DbSet<CambioSolicitudModel> CambiosSolicitud => Set<CambioSolicitudModel>();
    public DbSet<DecisionModel> Decisiones => Set<DecisionModel>();
    public DbSet<SolicitudExcepcionalModel> SolicitudesExcepcionales => Set<SolicitudExcepcionalModel>();

    //Historial, uso de espacio, notificaciones y bitácora
    public DbSet<HistorialEstadoModel> HistorialesEstado => Set<HistorialEstadoModel>();
    public DbSet<UsoEspacioModel> UsosEspacio => Set<UsoEspacioModel>();
    public DbSet<NotificacionModel> Notificaciones => Set<NotificacionModel>();
    public DbSet<BitacoraModel> Bitacoras => Set<BitacoraModel>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        //CATÁLOGOS BASE
        modelBuilder.Entity<RolModel>(entity =>
        {
            entity.ToTable("rol", "public");
            entity.HasKey(e => e.IdRol);

            entity.Property(e => e.IdRol).HasColumnName("id_rol");
            entity.Property(e => e.NombreRol).HasColumnName("nombre_rol").HasMaxLength(50).IsRequired();
        });

        modelBuilder.Entity<CarreraModel>(entity =>
        {
            entity.ToTable("carrera", "public");
            entity.HasKey(e => e.IdCarrera);

            entity.Property(e => e.IdCarrera).HasColumnName("id_carrera");
            entity.Property(e => e.Nombre).HasColumnName("nombre").HasMaxLength(100).IsRequired();
        });

        modelBuilder.Entity<AreaAcademicaModel>(entity =>
        {
            entity.ToTable("area_academica", "public");
            entity.HasKey(e => e.IdArea);

            entity.Property(e => e.IdArea).HasColumnName("id_area");
            entity.Property(e => e.Nombre).HasColumnName("nombre").HasMaxLength(100).IsRequired();
        });

        modelBuilder.Entity<EstadoSolicitudModel>(entity =>
        {
            entity.ToTable("estado_solicitud", "public");
            entity.HasKey(e => e.IdEstado);

            entity.Property(e => e.IdEstado).HasColumnName("id_estado");
            entity.Property(e => e.CodigoEstado).HasColumnName("codigo_estado").HasMaxLength(30).IsRequired();
            entity.Property(e => e.NombreEstado).HasColumnName("nombre_estado").HasMaxLength(50).IsRequired();
        });

        //USUARIOS Y TOKENS DE CORREO
        modelBuilder.Entity<UsuarioModel>(entity =>
        {
            entity.ToTable("usuario", "public");
            entity.HasKey(e => e.IdUsuario);

            entity.Property(e => e.IdUsuario).HasColumnName("id_usuario");
            entity.Property(e => e.IdRol).HasColumnName("id_rol").IsRequired();
            entity.Property(e => e.Nombre).HasColumnName("nombre").HasMaxLength(100).IsRequired();
            entity.Property(e => e.CorreoInstitucional).HasColumnName("correo_institucional").HasMaxLength(120).IsRequired();
            entity.Property(e => e.ContrasenaHash).HasColumnName("contrasena_hash").HasMaxLength(255).IsRequired();
            entity.Property(e => e.EstadoCuenta).HasColumnName("estado_cuenta").HasMaxLength(30).IsRequired();
            entity.Property(e => e.IdCarrera).HasColumnName("id_carrera");
            entity.Property(e => e.IdArea).HasColumnName("id_area");
            entity.Property(e => e.CreadoEn).HasColumnName("creado_en").IsRequired();

            entity.HasOne(e => e.Rol)
                .WithMany(r => r.Usuarios)
                .HasForeignKey(e => e.IdRol)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Carrera)
                .WithMany(c => c.Usuarios)
                .HasForeignKey(e => e.IdCarrera)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.AreaAcademica)
                .WithMany(a => a.Usuarios)
                .HasForeignKey(e => e.IdArea)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TokenCorreoModel>(entity =>
        {
            entity.ToTable("token_correo", "public");
            entity.HasKey(e => e.IdToken);

            entity.Property(e => e.IdToken).HasColumnName("id_token");
            entity.Property(e => e.IdUsuario).HasColumnName("id_usuario").IsRequired();
            entity.Property(e => e.Tipo).HasColumnName("tipo").HasMaxLength(30).IsRequired();
            entity.Property(e => e.Codigo).HasColumnName("codigo").HasMaxLength(100).IsRequired();
            entity.Property(e => e.FechaExpira).HasColumnName("fecha_expira").IsRequired();
            entity.Property(e => e.Usado).HasColumnName("usado").IsRequired();
            entity.Property(e => e.CreadoEn).HasColumnName("creado_en").IsRequired();

            entity.HasOne(e => e.Usuario)
                .WithMany(u => u.TokensCorreo)
                .HasForeignKey(e => e.IdUsuario)
                .OnDelete(DeleteBehavior.Cascade);
        });

        //ESPACIOS, ACCESOS, EQUIPOS E INCIDENCIAS
        modelBuilder.Entity<EspacioModel>(entity =>
        {
            entity.ToTable("espacio", "public");
            entity.HasKey(e => e.IdEspacio);

            entity.Property(e => e.IdEspacio).HasColumnName("id_espacio");
            entity.Property(e => e.Nombre).HasColumnName("nombre").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Tipo).HasColumnName("tipo").HasMaxLength(30).IsRequired();
            entity.Property(e => e.Ubicacion).HasColumnName("ubicacion").HasMaxLength(150).IsRequired();
            entity.Property(e => e.Capacidad).HasColumnName("capacidad").IsRequired();
            entity.Property(e => e.Estado).HasColumnName("estado").HasMaxLength(20).IsRequired();
            entity.Property(e => e.IdEncargado).HasColumnName("id_encargado").IsRequired();

            entity.HasOne(e => e.Encargado)
                .WithMany(u => u.EspaciosEncargados)
                .HasForeignKey(e => e.IdEncargado)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AccesoEspacioModel>(entity =>
        {
            entity.ToTable("acceso_espacio", "public");
            entity.HasKey(e => e.IdAcceso);

            entity.Property(e => e.IdAcceso).HasColumnName("id_acceso");
            entity.Property(e => e.IdEspacio).HasColumnName("id_espacio").IsRequired();
            entity.Property(e => e.IdCarrera).HasColumnName("id_carrera");
            entity.Property(e => e.IdArea).HasColumnName("id_area");

            entity.HasOne(e => e.Espacio)
                .WithMany(es => es.Accesos)
                .HasForeignKey(e => e.IdEspacio)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Carrera)
                .WithMany(c => c.AccesosEspacio)
                .HasForeignKey(e => e.IdCarrera)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.AreaAcademica)
                .WithMany(a => a.AccesosEspacio)
                .HasForeignKey(e => e.IdArea)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<EquipoModel>(entity =>
        {
            entity.ToTable("equipo", "public");
            entity.HasKey(e => e.IdEquipo);

            entity.Property(e => e.IdEquipo).HasColumnName("id_equipo");
            entity.Property(e => e.IdEspacio).HasColumnName("id_espacio").IsRequired();
            entity.Property(e => e.Nombre).HasColumnName("nombre").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Estado).HasColumnName("estado").HasMaxLength(20).IsRequired();

            entity.HasOne(e => e.Espacio)
                .WithMany(es => es.Equipos)
                .HasForeignKey(e => e.IdEspacio)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<IncidenciaModel>(entity =>
        {
            entity.ToTable("incidencia", "public");
            entity.HasKey(e => e.IdIncidencia);

            entity.Property(e => e.IdIncidencia).HasColumnName("id_incidencia");
            entity.Property(e => e.IdEquipo).HasColumnName("id_equipo").IsRequired();
            entity.Property(e => e.IdReporta).HasColumnName("id_reporta").IsRequired();
            entity.Property(e => e.Descripcion).HasColumnName("descripcion").IsRequired();
            entity.Property(e => e.FechaReporte).HasColumnName("fecha_reporte").IsRequired();
            entity.Property(e => e.Estado).HasColumnName("estado").HasMaxLength(20).IsRequired();
            entity.Property(e => e.Solucion).HasColumnName("solucion");
            entity.Property(e => e.FechaSolucion).HasColumnName("fecha_solucion");

            entity.HasOne(e => e.Equipo)
                .WithMany(eq => eq.Incidencias)
                .HasForeignKey(e => e.IdEquipo)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Reporta)
                .WithMany(u => u.IncidenciasReportadas)
                .HasForeignKey(e => e.IdReporta)
                .OnDelete(DeleteBehavior.Restrict);
        });

        //CICLOS, HORARIOS INSTITUCIONALES Y BLOQUEOS
        modelBuilder.Entity<CicloModel>(entity =>
        {
            entity.ToTable("ciclo", "public");
            entity.HasKey(e => e.IdCiclo);

            entity.Property(e => e.IdCiclo).HasColumnName("id_ciclo");
            entity.Property(e => e.Nombre).HasColumnName("nombre").HasMaxLength(50).IsRequired();
            entity.Property(e => e.FechaInicio).HasColumnName("fecha_inicio").IsRequired();
            entity.Property(e => e.FechaFin).HasColumnName("fecha_fin").IsRequired();
        });

        modelBuilder.Entity<HorarioInstitucionalModel>(entity =>
        {
            entity.ToTable("horario_institucional", "public");
            entity.HasKey(e => e.IdHorario);

            entity.Property(e => e.IdHorario).HasColumnName("id_horario");
            entity.Property(e => e.IdCiclo).HasColumnName("id_ciclo").IsRequired();
            entity.Property(e => e.IdEspacio).HasColumnName("id_espacio").IsRequired();
            entity.Property(e => e.DiaSemana).HasColumnName("dia_semana").HasMaxLength(15).IsRequired();
            entity.Property(e => e.HoraInicio).HasColumnName("hora_inicio").IsRequired();
            entity.Property(e => e.HoraFin).HasColumnName("hora_fin").IsRequired();
            entity.Property(e => e.Asignatura).HasColumnName("asignatura").HasMaxLength(120).IsRequired();
            entity.Property(e => e.DocenteTitular).HasColumnName("docente_titular").HasMaxLength(100).IsRequired();

            entity.HasOne(e => e.Ciclo)
                .WithMany(c => c.HorariosInstitucionales)
                .HasForeignKey(e => e.IdCiclo)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Espacio)
                .WithMany(es => es.HorariosInstitucionales)
                .HasForeignKey(e => e.IdEspacio)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<BloqueoModel>(entity =>
        {
            entity.ToTable("bloqueo", "public");
            entity.HasKey(e => e.IdBloqueo);

            entity.Property(e => e.IdBloqueo).HasColumnName("id_bloqueo");
            entity.Property(e => e.IdEspacio).HasColumnName("id_espacio").IsRequired();
            entity.Property(e => e.IdCreador).HasColumnName("id_creador").IsRequired();
            entity.Property(e => e.Motivo).HasColumnName("motivo").HasMaxLength(200).IsRequired();
            entity.Property(e => e.Inicio).HasColumnName("inicio").IsRequired();
            entity.Property(e => e.Fin).HasColumnName("fin").IsRequired();
            entity.Property(e => e.Activo).HasColumnName("activo").IsRequired();

            entity.HasOne(e => e.Espacio)
                .WithMany(es => es.Bloqueos)
                .HasForeignKey(e => e.IdEspacio)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Creador)
                .WithMany(u => u.BloqueosCreados)
                .HasForeignKey(e => e.IdCreador)
                .OnDelete(DeleteBehavior.Restrict);
        });

        //SOLICITUDES, ADJUNTOS, CAMBIOS, DECISIONES Y EXCEPCIONES
        modelBuilder.Entity<SolicitudModel>(entity =>
        {
            entity.ToTable("solicitud", "public");
            entity.HasKey(e => e.IdSolicitud);

            entity.Property(e => e.IdSolicitud).HasColumnName("id_solicitud");
            entity.Property(e => e.IdSolicitante).HasColumnName("id_solicitante").IsRequired();
            entity.Property(e => e.IdEspacio).HasColumnName("id_espacio").IsRequired();
            entity.Property(e => e.IdCarrera).HasColumnName("id_carrera");
            entity.Property(e => e.Fecha).HasColumnName("fecha").IsRequired();
            entity.Property(e => e.HoraInicio).HasColumnName("hora_inicio").IsRequired();
            entity.Property(e => e.HoraFin).HasColumnName("hora_fin").IsRequired();
            entity.Property(e => e.Asignatura).HasColumnName("asignatura").HasMaxLength(120).IsRequired();
            entity.Property(e => e.DocenteResponsable).HasColumnName("docente_responsable").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Participantes).HasColumnName("participantes").IsRequired();
            entity.Property(e => e.Motivo).HasColumnName("motivo").IsRequired();
            entity.Property(e => e.Tipo).HasColumnName("tipo").HasMaxLength(20).IsRequired();
            entity.Property(e => e.IdEstado).HasColumnName("id_estado").IsRequired();
            entity.Property(e => e.FechaRegistro).HasColumnName("fecha_registro").IsRequired();

            entity.HasOne(e => e.Solicitante)
                .WithMany(u => u.Solicitudes)
                .HasForeignKey(e => e.IdSolicitante)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Espacio)
                .WithMany(es => es.Solicitudes)
                .HasForeignKey(e => e.IdEspacio)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Carrera)
                .WithMany(c => c.Solicitudes)
                .HasForeignKey(e => e.IdCarrera)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.EstadoSolicitud)
                .WithMany(est => est.Solicitudes)
                .HasForeignKey(e => e.IdEstado)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<AdjuntoModel>(entity =>
        {
            entity.ToTable("adjunto", "public");
            entity.HasKey(e => e.IdAdjunto);

            entity.Property(e => e.IdAdjunto).HasColumnName("id_adjunto");
            entity.Property(e => e.IdSolicitud).HasColumnName("id_solicitud").IsRequired();
            entity.Property(e => e.NombreArchivo).HasColumnName("nombre_archivo").HasMaxLength(150).IsRequired();
            entity.Property(e => e.Formato).HasColumnName("formato").HasMaxLength(10).IsRequired();
            entity.Property(e => e.TamanoBytes).HasColumnName("tamano_bytes").IsRequired();
            entity.Property(e => e.Ruta).HasColumnName("ruta").HasMaxLength(255).IsRequired();

            entity.HasOne(e => e.Solicitud)
                .WithMany(s => s.Adjuntos)
                .HasForeignKey(e => e.IdSolicitud)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CambioSolicitudModel>(entity =>
        {
            entity.ToTable("cambio_solicitud", "public");
            entity.HasKey(e => e.IdCambio);

            entity.Property(e => e.IdCambio).HasColumnName("id_cambio");
            entity.Property(e => e.IdSolicitud).HasColumnName("id_solicitud").IsRequired();
            entity.Property(e => e.NuevaFecha).HasColumnName("nueva_fecha").IsRequired();
            entity.Property(e => e.NuevaHoraInicio).HasColumnName("nueva_hora_inicio").IsRequired();
            entity.Property(e => e.NuevaHoraFin).HasColumnName("nueva_hora_fin").IsRequired();
            entity.Property(e => e.Estado).HasColumnName("estado").HasMaxLength(20).IsRequired();
            entity.Property(e => e.FechaSolicitud).HasColumnName("fecha_solicitud").IsRequired();

            entity.HasOne(e => e.Solicitud)
                .WithMany(s => s.CambiosSolicitud)
                .HasForeignKey(e => e.IdSolicitud)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DecisionModel>(entity =>
        {
            entity.ToTable("decision", "public");
            entity.HasKey(e => e.IdDecision);

            entity.Property(e => e.IdDecision).HasColumnName("id_decision");
            entity.Property(e => e.IdSolicitud).HasColumnName("id_solicitud").IsRequired();
            entity.Property(e => e.IdCambio).HasColumnName("id_cambio");
            entity.Property(e => e.TipoDecision).HasColumnName("tipo_decision").HasMaxLength(20).IsRequired();
            entity.Property(e => e.IdEncargado).HasColumnName("id_encargado").IsRequired();
            entity.Property(e => e.Resultado).HasColumnName("resultado").HasMaxLength(20).IsRequired();
            entity.Property(e => e.Motivo).HasColumnName("motivo");
            entity.Property(e => e.FechaHora).HasColumnName("fecha_hora").IsRequired();

            entity.HasOne(e => e.Solicitud)
                .WithMany(s => s.Decisiones)
                .HasForeignKey(e => e.IdSolicitud)
                .OnDelete(DeleteBehavior.Restrict);

            // Relación 1 a 1 opcional con cambio_solicitud (ux_decision_unica_por_cambio)
            entity.HasOne(e => e.CambioSolicitud)
                .WithOne(c => c.Decision)
                .HasForeignKey<DecisionModel>(e => e.IdCambio)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Encargado)
                .WithMany(u => u.Decisiones)
                .HasForeignKey(e => e.IdEncargado)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<SolicitudExcepcionalModel>(entity =>
        {
            entity.ToTable("solicitud_excepcional", "public");
            entity.HasKey(e => e.IdSolicitud);

            entity.Property(e => e.IdSolicitud).HasColumnName("id_solicitud");
            entity.Property(e => e.AutoridadNombre).HasColumnName("autoridad_nombre").HasMaxLength(100).IsRequired();
            entity.Property(e => e.AutoridadCargo).HasColumnName("autoridad_cargo").HasMaxLength(100).IsRequired();
            entity.Property(e => e.Justificacion).HasColumnName("justificacion").IsRequired();
            entity.Property(e => e.IdSolicitudAfectada).HasColumnName("id_solicitud_afectada");
            entity.Property(e => e.AlternativaOfrecida).HasColumnName("alternativa_ofrecida").HasMaxLength(200);

            entity.HasOne(e => e.Solicitud)
                .WithOne(s => s.SolicitudExcepcional)
                .HasForeignKey<SolicitudExcepcionalModel>(e => e.IdSolicitud)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.SolicitudAfectada)
                .WithMany(s => s.SolicitudesExcepcionalesAfectadas)
                .HasForeignKey(e => e.IdSolicitudAfectada)
                .OnDelete(DeleteBehavior.Restrict);
        });

        //HISTORIAL, USO DE ESPACIO, NOTIFICACIONES Y BITÁCORA
        modelBuilder.Entity<HistorialEstadoModel>(entity =>
        {
            entity.ToTable("historial_estado", "public");
            entity.HasKey(e => e.IdHistorial);

            entity.Property(e => e.IdHistorial).HasColumnName("id_historial");
            entity.Property(e => e.IdSolicitud).HasColumnName("id_solicitud").IsRequired();
            entity.Property(e => e.IdUsuario).HasColumnName("id_usuario").IsRequired();
            entity.Property(e => e.EstadoAnterior).HasColumnName("estado_anterior");
            entity.Property(e => e.EstadoNuevo).HasColumnName("estado_nuevo").IsRequired();
            entity.Property(e => e.Motivo).HasColumnName("motivo");
            entity.Property(e => e.FechaHora).HasColumnName("fecha_hora").IsRequired();

            entity.HasOne(e => e.Solicitud)
                .WithMany(s => s.HistorialesEstado)
                .HasForeignKey(e => e.IdSolicitud)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Usuario)
                .WithMany(u => u.HistorialesEstado)
                .HasForeignKey(e => e.IdUsuario)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.EstadoAnteriorNavigation)
                .WithMany()
                .HasForeignKey(e => e.EstadoAnterior)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.EstadoNuevoNavigation)
                .WithMany()
                .HasForeignKey(e => e.EstadoNuevo)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<UsoEspacioModel>(entity =>
        {
            entity.ToTable("uso_espacio", "public");
            entity.HasKey(e => e.IdUso);

            entity.Property(e => e.IdUso).HasColumnName("id_uso");
            entity.Property(e => e.IdSolicitud).HasColumnName("id_solicitud").IsRequired();
            entity.Property(e => e.IdEncargado).HasColumnName("id_encargado").IsRequired();
            entity.Property(e => e.Observacion).HasColumnName("observacion");
            entity.Property(e => e.FechaRegistro).HasColumnName("fecha_registro").IsRequired();

            entity.HasOne(e => e.Solicitud)
                .WithMany(s => s.UsosEspacio)
                .HasForeignKey(e => e.IdSolicitud)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Encargado)
                .WithMany(u => u.UsosEspacio)
                .HasForeignKey(e => e.IdEncargado)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<NotificacionModel>(entity =>
        {
            entity.ToTable("notificacion", "public");
            entity.HasKey(e => e.IdNotificacion);

            entity.Property(e => e.IdNotificacion).HasColumnName("id_notificacion");
            entity.Property(e => e.IdUsuario).HasColumnName("id_usuario").IsRequired();
            entity.Property(e => e.IdSolicitud).HasColumnName("id_solicitud");
            entity.Property(e => e.Tipo).HasColumnName("tipo").HasMaxLength(30).IsRequired();
            entity.Property(e => e.Asunto).HasColumnName("asunto").HasMaxLength(150).IsRequired();
            entity.Property(e => e.FechaEnvio).HasColumnName("fecha_envio").IsRequired();
            entity.Property(e => e.EstadoEnvio).HasColumnName("estado_envio").HasMaxLength(20).IsRequired();

            entity.HasOne(e => e.Usuario)
                .WithMany(u => u.Notificaciones)
                .HasForeignKey(e => e.IdUsuario)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Solicitud)
                .WithMany(s => s.Notificaciones)
                .HasForeignKey(e => e.IdSolicitud)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<BitacoraModel>(entity =>
        {
            entity.ToTable("bitacora", "public");
            entity.HasKey(e => e.IdBitacora);

            entity.Property(e => e.IdBitacora).HasColumnName("id_bitacora");
            entity.Property(e => e.IdUsuario).HasColumnName("id_usuario").IsRequired();
            entity.Property(e => e.Accion).HasColumnName("accion").HasMaxLength(60).IsRequired();
            entity.Property(e => e.Entidad).HasColumnName("entidad").HasMaxLength(40).IsRequired();
            entity.Property(e => e.IdEntidad).HasColumnName("id_entidad");
            entity.Property(e => e.FechaHora).HasColumnName("fecha_hora").IsRequired();

            entity.HasOne(e => e.Usuario)
                .WithMany(u => u.Bitacoras)
                .HasForeignKey(e => e.IdUsuario)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}