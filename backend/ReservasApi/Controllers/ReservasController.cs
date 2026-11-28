using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReservasApi.Data;
using ReservasApi.Models;

namespace ReservasApi.Controllers;

[ApiController]
[Route("api/reservas")]
[Authorize]
public class ReservasController : ControllerBase
{
    private readonly ReservasDbContext _db;

    public ReservasController(ReservasDbContext db)
    {
        _db = db;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
    private short UserRol => short.Parse(User.FindFirstValue(ClaimTypes.Role) ?? "0");

    private static readonly TimeOnly MananaInicio = new(7, 0);
    private static readonly TimeOnly MananaFin = new(12, 0);
    private static readonly TimeOnly TardeInicio = new(13, 0);
    private static readonly TimeOnly TardeFin = new(16, 0);

    private static bool EstaDentroDeJornada(DateOnly fecha, TimeOnly inicio, TimeOnly fin)
    {
        if (fecha.DayOfWeek == DayOfWeek.Sunday)
        {
            return false;
        }

        if (fin <= inicio)
        {   
            return false;
        }

        var enManana = inicio >= MananaInicio && fin <= MananaFin;
        var enTarde = inicio >= TardeInicio && fin <= TardeFin;
        return enManana || enTarde;
    }

    private static string ObtenerDiaSemana(DateOnly fecha)
    {
        return fecha.DayOfWeek switch
        {
            DayOfWeek.Monday => "lunes",
            DayOfWeek.Tuesday => "martes",
            DayOfWeek.Wednesday => "miercoles",
            DayOfWeek.Thursday => "jueves",
            DayOfWeek.Friday => "viernes",
            DayOfWeek.Saturday => "sabado",
            _ => "domingo"
        };
    }

    private async Task<bool> UsuarioTieneAccesoEspacioAsync(UsuarioModel usuario, EspacioModel espacio)
    {
        if (usuario.IdRol == 3)
            return espacio.IdEncargado == usuario.IdUsuario;

        if (usuario.IdRol == 1 && usuario.IdCarrera.HasValue)
        {
            return await _db.AccesosEspacio.AsNoTracking()
                .AnyAsync(a => a.IdEspacio == espacio.IdEspacio && a.IdCarrera == usuario.IdCarrera.Value);
        }

        if (usuario.IdRol == 2 && usuario.IdArea.HasValue)
        {
            return await _db.AccesosEspacio.AsNoTracking()
                .AnyAsync(a => a.IdEspacio == espacio.IdEspacio && a.IdArea == usuario.IdArea.Value);
        }

        return false;
    }

    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] string? estado, [FromQuery] string? busqueda)
    {
        var usuario = await _db.Usuarios.AsNoTracking()
            .FirstOrDefaultAsync(u => u.IdUsuario == UserId);
        if (usuario is null)
            return Unauthorized();

        var q = _db.Solicitudes.AsNoTracking()
            .Include(s => s.Espacio)
            .Include(s => s.Carrera)
            .Include(s => s.EstadoSolicitud)
            .Include(s => s.Solicitante)
            .Include(s => s.Decisiones)
            .AsQueryable();

        //Estudiantes y docentes ven solo sus propias solicitudes; encargado ve las de sus espacios
        if (UserRol is 1 or 2)
        {
            q = q.Where(s => s.IdSolicitante == UserId);
        }
        else if (UserRol == 3)
        {
            q = q.Where(s => s.Espacio != null && s.Espacio.IdEncargado == UserId);
        }
        else
        {
            return Forbid();
        }

        if (!string.IsNullOrWhiteSpace(estado) && estado != "Todos")
        {
            q = q.Where(s => s.EstadoSolicitud != null && (s.EstadoSolicitud.NombreEstado == estado || s.EstadoSolicitud.CodigoEstado == estado));
        }

        if (!string.IsNullOrWhiteSpace(busqueda))
        {
            var b = busqueda.Trim().ToLower();
            q = q.Where(s =>
                (s.Espacio != null && s.Espacio.Nombre.ToLower().Contains(b)) ||
                s.Asignatura.ToLower().Contains(b) ||
                s.DocenteResponsable.ToLower().Contains(b) ||
                (s.Solicitante != null && s.Solicitante.Nombre.ToLower().Contains(b)));
        }

        var list = await q.OrderByDescending(s => s.Fecha).ThenByDescending(s => s.HoraInicio).Take(200).Select(s => new
            {
                id_solicitud = s.IdSolicitud,
                id_espacio = s.IdEspacio,
                id_carrera = s.IdCarrera,
                asignatura = s.Asignatura,
                docente_responsable = s.DocenteResponsable,
                motivo = s.Motivo,
                tipo = s.Tipo,
                fecha = s.Fecha.ToString("yyyy-MM-dd"),
                hora_inicio = s.HoraInicio.ToString("HH:mm"),
                hora_fin = s.HoraFin.ToString("HH:mm"),
                participantes = s.Participantes,
                id_estado = s.IdEstado,
                codigo_estado = s.EstadoSolicitud != null ? s.EstadoSolicitud.CodigoEstado : string.Empty,
                nombre_estado = s.EstadoSolicitud != null ? s.EstadoSolicitud.NombreEstado : string.Empty,
                nombre_espacio = s.Espacio != null ? s.Espacio.Nombre : string.Empty,
                nombre_carrera = s.Carrera != null ? s.Carrera.Nombre : string.Empty,
                solicitante = s.Solicitante != null ? s.Solicitante.Nombre : string.Empty,
                motivo_decision = s.Decisiones
                    .OrderByDescending(d => d.FechaHora)
                    .Select(d => d.Motivo)
                    .FirstOrDefault()
            }).ToListAsync();

        return Ok(list);
    }

    public record CrearSolicitudDto(int IdEspacio,int? IdCarrera,string Fecha,string HoraInicio,string HoraFin,string Asignatura,string DocenteResponsable,int Participantes,string Motivo,string? Tipo);

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearSolicitudDto body)
    {
        if (UserRol is not (1 or 2))
        {
            return Forbid();
        }

        var usuario = await _db.Usuarios.AsNoTracking().FirstOrDefaultAsync(u => u.IdUsuario == UserId);
        if (usuario is null)
        { 
            return Unauthorized();
        }

        if (!DateOnly.TryParse(body.Fecha, out var fecha))
        { 
            return BadRequest(new { error = "Fecha inválida" });
        }

        if (fecha < DateOnly.FromDateTime(DateTime.Today))
        {
            return BadRequest(new { error = "No se permiten reservas en fechas pasadas" });
        }

        if (!TimeOnly.TryParse(body.HoraInicio, out var hi) || !TimeOnly.TryParse(body.HoraFin, out var hf))
        { 
            return BadRequest(new { error = "Horario inválido" });
        }
        if (!EstaDentroDeJornada(fecha, hi, hf))
        {
            return BadRequest(new { error = "El horario debe ser de lunes a sábado entre 07:00-12:00 o 13:00-16:00" });
        }
        if (string.IsNullOrWhiteSpace(body.Asignatura) || string.IsNullOrWhiteSpace(body.DocenteResponsable) || string.IsNullOrWhiteSpace(body.Motivo))
        {
            return BadRequest(new { error = "Asignatura, docente responsable y motivo son obligatorios" });
        }

        if (body.Participantes <= 0)
        {
            return BadRequest(new { error = "La cantidad de participantes debe ser mayor a 0" });
        }

        var espacio = await _db.Espacios.AsNoTracking().FirstOrDefaultAsync(e => e.IdEspacio == body.IdEspacio && e.Estado == "activo");
        if (espacio is null)
        {
            return BadRequest(new { error = "Espacio no válido o desactivado" });
        }

        if (!await UsuarioTieneAccesoEspacioAsync(usuario, espacio))
        {
            return Forbid();
        }
        if (body.Participantes > espacio.Capacidad)
        {
            return BadRequest(new { error = $"La capacidad máxima del espacio es {espacio.Capacidad}" });
        }

        int? idCarrera = body.IdCarrera;
        if (usuario.IdRol == 1)
        {
            idCarrera = usuario.IdCarrera;
        }
        else if (idCarrera is <= 0)
        {
            idCarrera = null;
        }

        if (idCarrera.HasValue)
        {
            var existeCarrera = await _db.Carreras.AsNoTracking().AnyAsync(c => c.IdCarrera == idCarrera.Value);
            if (!existeCarrera)
                return BadRequest(new { error = "Carrera no válida" });
        }

        //Choque con reservas aprobadas (id_estado = 3)
        var choqueReserva = await _db.Solicitudes.AsNoTracking().AnyAsync(s => s.IdEspacio == body.IdEspacio && s.Fecha == fecha && s.IdEstado == 3 && hi < s.HoraFin && hf > s.HoraInicio);
        if (choqueReserva)
        { 
            return Conflict(new { error = "Conflicto: ya existe una reserva aprobada en ese horario" });
        }
        //Choque con bloqueos activos
        var inicioTs = fecha.ToDateTime(hi);
        var finTs = fecha.ToDateTime(hf);
        var choqueBloqueo = await _db.Bloqueos.AsNoTracking().AnyAsync(b => b.IdEspacio == body.IdEspacio && b.Activo && inicioTs < b.Fin && finTs > b.Inicio);
        if (choqueBloqueo)
        {
            return Conflict(new { error = "Conflicto: el espacio tiene un bloqueo activo en ese período" });
        }

        //Choque con horario institucional del ciclo vigente
        var diaSemana = ObtenerDiaSemana(fecha);
        var choqueHorario = await _db.HorariosInstitucionales.AsNoTracking().Include(h => h.Ciclo).AnyAsync(h => h.IdEspacio == body.IdEspacio && h.DiaSemana == diaSemana && h.Ciclo != null && fecha >= h.Ciclo.FechaInicio && fecha <= h.Ciclo.FechaFin && hi < h.HoraFin && hf > h.HoraInicio);
        if (choqueHorario)
        {
            return Conflict(new { error = "Conflicto: el espacio tiene un horario institucional programado" });
        }

        var tipoSolicitud = string.IsNullOrWhiteSpace(body.Tipo) ? "ordinaria" : body.Tipo.Trim().ToLower();
        if (tipoSolicitud is not ("ordinaria" or "excepcional"))
            tipoSolicitud = "ordinaria";

        await using var tx = await _db.Database.BeginTransactionAsync();
        await _db.Database.ExecuteSqlAsync($"SELECT set_config('app.id_usuario', {UserId.ToString()}, true)");

        var solicitud = new SolicitudModel
        {
            IdSolicitante = UserId,
            IdEspacio = body.IdEspacio,
            IdCarrera = idCarrera,
            Fecha = fecha,
            HoraInicio = hi,
            HoraFin = hf,
            Asignatura = body.Asignatura.Trim(),
            DocenteResponsable = body.DocenteResponsable.Trim(),
            Participantes = body.Participantes,
            Motivo = body.Motivo.Trim(),
            Tipo = tipoSolicitud,
            IdEstado = 1, //pendiente_revision
            FechaRegistro = DateTime.Now
        };

        _db.Solicitudes.Add(solicitud);

        try
        {
            await _db.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch (DbUpdateException ex)
        {
            await tx.RollbackAsync();
            return Conflict(new { error = ex.InnerException?.Message ?? ex.Message });
        }

        return StatusCode(201, new
        {
            id_solicitud = solicitud.IdSolicitud,
            id_estado = solicitud.IdEstado,
            message = "Solicitud registrada como pendiente de revisión"
        });
    }

    public record DecisionSolicitudDto(short IdEstado, string? Motivo);

    [HttpPatch("{id:int}/estado")]
    public async Task<IActionResult> CambiarEstado(int id, [FromBody] DecisionSolicitudDto body)
    {
        if (UserRol != 3)
            return Forbid();

        var solicitud = await _db.Solicitudes.Include(s => s.Espacio).FirstOrDefaultAsync(s => s.IdSolicitud == id);

        if (solicitud is null)
        {
            return NotFound(new { error = "Solicitud no encontrada" });
        }

        if (solicitud.Espacio is null || solicitud.Espacio.IdEncargado != UserId)
        {
            return Forbid();
        }

        //estados válidos en decisión de encargado: 2 = en_revision, 3 = aprobada, 4 = rechazada
        if (body.IdEstado is not (2 or 3 or 4))
        {
            return BadRequest(new { error = "Estado no válido para revisión de encargado (use 2, 3 o 4)" });
        }

        if (body.IdEstado == 4 && string.IsNullOrWhiteSpace(body.Motivo))
        {
            return BadRequest(new { error = "El motivo es obligatorio cuando se rechaza una solicitud" });
        }
        if (body.IdEstado == 3)
        {
            var choqueReserva = await _db.Solicitudes.AsNoTracking().AnyAsync(s => s.IdSolicitud != solicitud.IdSolicitud &&
            s.IdEspacio == solicitud.IdEspacio &&
            s.Fecha == solicitud.Fecha &&
            s.IdEstado == 3 &&
            solicitud.HoraInicio < s.HoraFin &&
            solicitud.HoraFin > s.HoraInicio);
            if (choqueReserva)
                return Conflict(new { error = "No se puede aprobar: ya existe otra reserva aprobada en ese horario" });
        }

        await using var tx = await _db.Database.BeginTransactionAsync();
        await _db.Database.ExecuteSqlAsync(
            $"SELECT set_config('app.id_usuario', {UserId.ToString()}, true)");

        solicitud.IdEstado = body.IdEstado;

        if (body.IdEstado is 3 or 4)
        {
            var decision = new DecisionModel
            {
                IdSolicitud = solicitud.IdSolicitud,
                IdCambio = null,
                TipoDecision = "solicitud_inicial",
                IdEncargado = UserId,
                Resultado = body.IdEstado == 3 ? "aprobada" : "rechazada",
                Motivo = string.IsNullOrWhiteSpace(body.Motivo) ? null : body.Motivo.Trim(),
                FechaHora = DateTime.Now
            };
            _db.Decisiones.Add(decision);
        }

        try
        {
            await _db.SaveChangesAsync();
            await tx.CommitAsync();
        }
        catch (DbUpdateException ex)
        {
            await tx.RollbackAsync();
            return Conflict(new { error = ex.InnerException?.Message ?? ex.Message });
        }

        return Ok(new { id_solicitud = solicitud.IdSolicitud, id_estado = solicitud.IdEstado });
    }

    [HttpGet("estados")]
    public async Task<IActionResult> Estados()
    {
        var estados = await _db.EstadosSolicitud.AsNoTracking().OrderBy(e => e.IdEstado).Select(e => new
            {
                id_estado = e.IdEstado,
                codigo_estado = e.CodigoEstado,
                nombre_estado = e.NombreEstado
            }).ToListAsync();
        return Ok(estados);
    }

    [HttpGet("carreras")]
    public async Task<IActionResult> Carreras()
    {
        var carreras = await _db.Carreras.AsNoTracking().OrderBy(c => c.Nombre).Select(c => new
        {
            id_carrera = c.IdCarrera,
            nombre = c.Nombre
        }).ToListAsync();

        return Ok(carreras);
    }

    [HttpGet("disponibilidad")]
    public async Task<IActionResult> Disponibilidad([FromQuery] int id_espacio, [FromQuery] string fecha)
    {
        if (!DateOnly.TryParse(fecha, out var f))
            return BadRequest(new { error = "Fecha inválida" });

        var reservas = await _db.Solicitudes.AsNoTracking().Include(s => s.EstadoSolicitud).Include(s => s.Solicitante).Where(s => s.IdEspacio == id_espacio && s.Fecha == f && s.IdEstado <= 3).OrderBy(s => s.HoraInicio).Select(s => new
            {
                hora_inicio = s.HoraInicio.ToString("HH:mm"),
                hora_fin = s.HoraFin.ToString("HH:mm"),
                codigo_estado = s.EstadoSolicitud != null ? s.EstadoSolicitud.CodigoEstado : string.Empty,
                nombre_estado = s.EstadoSolicitud != null ? s.EstadoSolicitud.NombreEstado : string.Empty,
                solicitante = s.Solicitante != null ? s.Solicitante.Nombre : string.Empty,
                asignatura = s.Asignatura,
                motivo = s.Motivo
            }).ToListAsync();

        var inicioDia = f.ToDateTime(TimeOnly.MinValue);
        var finDia = f.ToDateTime(TimeOnly.MaxValue);

        var bloqueos = await _db.Bloqueos.AsNoTracking().Where(b => b.IdEspacio == id_espacio && b.Activo && b.Inicio <= finDia && b.Fin >= inicioDia).OrderBy(b => b.Inicio).Select(b => new
            {
                id_bloqueo = b.IdBloqueo,
                motivo = b.Motivo,
                inicio = b.Inicio,
                fin = b.Fin
            }).ToListAsync();

        var diaSemana = ObtenerDiaSemana(f);
        var horarios = await _db.HorariosInstitucionales.AsNoTracking().Include(h => h.Ciclo).Where(h => h.IdEspacio == id_espacio &&
                        h.DiaSemana == diaSemana &&
                        h.Ciclo != null &&
                        f >= h.Ciclo.FechaInicio &&
                        f <= h.Ciclo.FechaFin).OrderBy(h => h.HoraInicio).Select(h => new
            {
                id_horario = h.IdHorario,
                dia_semana = h.DiaSemana,
                hora_inicio = h.HoraInicio.ToString("HH:mm"),
                hora_fin = h.HoraFin.ToString("HH:mm"),
                asignatura = h.Asignatura,
                docente_titular = h.DocenteTitular
            }).ToListAsync();

        return Ok(new
        {
            fecha = f.ToString("yyyy-MM-dd"),
            id_espacio,
            reservas,
            bloqueos,
            horarios_institucionales = horarios
        });
    }

    [HttpGet("calendario")]
    public async Task<IActionResult> Calendario([FromQuery] string fecha, [FromQuery] int? id_espacio)
    {
        if (!DateOnly.TryParse(fecha, out var f))
            return BadRequest(new { error = "Fecha inválida (yyyy-MM-dd)" });

        var q = _db.Solicitudes.AsNoTracking().Include(s => s.EstadoSolicitud).Include(s => s.Solicitante).Include(s => s.Espacio).Where(s => s.Fecha == f && s.IdEstado <= 3);

        if (id_espacio is > 0)
            q = q.Where(s => s.IdEspacio == id_espacio.Value);

        var list = await q.OrderBy(s => s.HoraInicio).Select(s => new
            {
                id_solicitud = s.IdSolicitud,
                id_espacio = s.IdEspacio,
                nombre_espacio = s.Espacio != null ? s.Espacio.Nombre : string.Empty,
                fecha = s.Fecha.ToString("yyyy-MM-dd"),
                hora_inicio = s.HoraInicio.ToString("HH:mm"),
                hora_fin = s.HoraFin.ToString("HH:mm"),
                nombre_estado = s.EstadoSolicitud != null ? s.EstadoSolicitud.NombreEstado : string.Empty,
                solicitante = s.Solicitante != null ? s.Solicitante.Nombre : string.Empty,
                asignatura = s.Asignatura,
                motivo = s.Motivo
            }).ToListAsync();

        var inicioMes = new DateOnly(f.Year, f.Month, 1);
        var finMes = inicioMes.AddMonths(1).AddDays(-1);

        var qMes = _db.Solicitudes.AsNoTracking().Where(s => s.Fecha >= inicioMes && s.Fecha <= finMes && s.IdEstado <= 3);

        if (id_espacio is > 0)
            qMes = qMes.Where(s => s.IdEspacio == id_espacio.Value);

        var porDia = await qMes.GroupBy(s => s.Fecha).Select(g => new
            {
                fecha = g.Key.ToString("yyyy-MM-dd"),
                total = g.Count()
            }).ToListAsync();

        return Ok(new
        {
            fecha = f.ToString("yyyy-MM-dd"),
            reservas = list,
            dias_con_reserva = porDia
        });
    }

    [HttpGet("reporte")]
    public async Task<IActionResult> Reporte([FromQuery] string desde, [FromQuery] string hasta)
    {
        if (!DateOnly.TryParse(desde, out var d1) || !DateOnly.TryParse(hasta, out var d2))
        {
            return BadRequest(new { error = "Rango de fechas inválido" });
        }

        if (d2 < d1)
            return BadRequest(new { error = "hasta debe ser mayor o igual que desde" });

        var q = _db.Solicitudes.AsNoTracking().Include(s => s.EstadoSolicitud).Include(s => s.Espacio).Include(s => s.Solicitante).Where(s => s.Fecha >= d1 && s.Fecha <= d2);

        //si es encargado, limita el reporte a los espacios que administra (RN-12 / RF-20)
        if (UserRol == 3)
            q = q.Where(s => s.Espacio != null && s.Espacio.IdEncargado == UserId);

        var list = await q.OrderBy(s => s.Fecha).ThenBy(s => s.HoraInicio).Select(s => new
            {
                id_solicitud = s.IdSolicitud,
                fecha = s.Fecha.ToString("yyyy-MM-dd"),
                hora_inicio = s.HoraInicio.ToString("HH:mm"),
                hora_fin = s.HoraFin.ToString("HH:mm"),
                nombre_espacio = s.Espacio != null ? s.Espacio.Nombre : string.Empty,
                nombre_estado = s.EstadoSolicitud != null ? s.EstadoSolicitud.NombreEstado : string.Empty,
                id_estado = s.IdEstado,
                solicitante = s.Solicitante != null ? s.Solicitante.Nombre : string.Empty,
                asignatura = s.Asignatura,
                participantes = s.Participantes
            }).ToListAsync();

        var porEstado = list.GroupBy(x => x.nombre_estado).Select(g => new { estado = g.Key, total = g.Count() });

        var porEspacio = list.GroupBy(x => x.nombre_espacio).Select(g => new { espacio = g.Key, total = g.Count() });

        return Ok(new
        {
            desde = d1.ToString("yyyy-MM-dd"),
            hasta = d2.ToString("yyyy-MM-dd"),
            total = list.Count,
            por_estado = porEstado,
            por_espacio = porEspacio,
            detalle = list
        });
    }
}