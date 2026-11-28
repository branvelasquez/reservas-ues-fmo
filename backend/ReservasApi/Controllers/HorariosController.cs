using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReservasApi.Data;
using ReservasApi.Models;

namespace ReservasApi.Controllers;

[ApiController]
[Route("api/horarios")]
[Authorize]
public class HorariosController : ControllerBase
{
    private readonly ReservasDbContext _db;
    public HorariosController(ReservasDbContext db)  
    {
        _db = db;
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
    private short RoleId => short.Parse(User.FindFirstValue(ClaimTypes.Role) ?? "4");

    private static readonly Dictionary<short, string> DiasPorNumero = new()
    {
        [1] = "lunes",
        [2] = "martes",
        [3] = "miercoles",
        [4] = "jueves",
        [5] = "viernes",
        [6] = "sabado"
    };

    private static readonly TimeOnly MananaInicio = new(7, 0);
    private static readonly TimeOnly MananaFin = new(12, 0);
    private static readonly TimeOnly TardeInicio = new(13, 0);
    private static readonly TimeOnly TardeFin = new(16, 0);

    //jornada institucional: 07:00-12:00 o 13:00-16:00 sin cruzar franjas
    private static bool EstaDentroDeJornada(TimeOnly inicio, TimeOnly fin) 
    { 
        return (inicio >= MananaInicio && fin <= MananaFin) || (inicio >= TardeInicio && fin <= TardeFin);
    }

    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] int? id_espacio)
    {
        var q = _db.HorariosInstitucionales.AsNoTracking()
            .Include(h => h.Espacio)
            .Include(h => h.Ciclo)
            .AsQueryable();

        if (id_espacio is > 0)
        {
            q = q.Where(h => h.IdEspacio == id_espacio);   
        }

        var list = await q.OrderBy(h => h.DiaSemana).ThenBy(h => h.HoraInicio).Select(h => new
        {
            id_horario = h.IdHorario,
            id_espacio = h.IdEspacio,
            nombre_espacio = h.Espacio != null ? h.Espacio.Nombre : null,
            asignatura = h.Asignatura,
            docente_titular = h.DocenteTitular,
            id_ciclo = h.IdCiclo,
            nombre_ciclo = h.Ciclo != null ? h.Ciclo.Nombre : null,
            dia_semana = h.DiaSemana,
            hora_inicio = h.HoraInicio.ToString("HH:mm"),
            hora_fin = h.HoraFin.ToString("HH:mm")
        }).ToListAsync();

        return Ok(list);
    }

    [HttpGet("ciclos")]
    public async Task<IActionResult> Ciclos() =>
        Ok(await _db.Ciclos.AsNoTracking().OrderByDescending(c => c.FechaInicio)
            .Select(c => new
            {
                id_ciclo = c.IdCiclo,
                nombre_ciclo = c.Nombre,
                fecha_inicio = c.FechaInicio.ToString("yyyy-MM-dd"),
                fecha_fin = c.FechaFin.ToString("yyyy-MM-dd")
            }).ToListAsync());

    public record CrearHorarioBody(
        int IdEspacio,
        string Asignatura,
        string DocenteTitular,
        int IdCiclo,
        string HoraInicio,
        string HoraFin,
        short[] Dias
    );

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearHorarioBody body)
    {
        if (RoleId != 3)
        {
            return Forbid();   
        }

        if (body.Dias is null || body.Dias.Length == 0)
        {
            return BadRequest(new { error = "Selecciona al menos un día" });   
        }

        if (!TimeOnly.TryParse(body.HoraInicio, out var hi) || !TimeOnly.TryParse(body.HoraFin, out var hf))
        {
            return BadRequest(new { error = "Horas inválidas" });
        }
        if (hf <= hi)
        {
            return BadRequest(new { error = "La hora fin debe ser mayor que la de inicio" });
        }
        if (!EstaDentroDeJornada(hi, hf))
        {
            return BadRequest(new { error = "El horario debe estar dentro de la jornada institucional (7:00-12:00 o 13:00-16:00)" });
        }

        var espacio = await _db.Espacios.AsNoTracking().FirstOrDefaultAsync(e => e.IdEspacio == body.IdEspacio);
        if (espacio is null)
        { 
            return BadRequest(new { error = "Espacio no existe" });
        }

        if (espacio.IdEncargado != UserId) 
        {
            return Forbid();
        }


        var cicloId = body.IdCiclo;
        if (cicloId <= 0)
        {
            var ciclo = await _db.Ciclos.OrderByDescending(c => c.FechaInicio).FirstOrDefaultAsync();
            if (ciclo is null)
            {
                ciclo = new CicloModel
                {
                    Nombre = "Ciclo actual",
                    FechaInicio = DateOnly.FromDateTime(DateTime.Today.AddMonths(-2)),
                    FechaFin = DateOnly.FromDateTime(DateTime.Today.AddMonths(4))
                };
                _db.Ciclos.Add(ciclo);
                await _db.SaveChangesAsync();
            }
            cicloId = ciclo.IdCiclo;
        }

        var creados = new List<HorarioInstitucionalModel>();
        foreach (var d in body.Dias.Distinct())
        {
            if(!DiasPorNumero.TryGetValue(d, out var diaNombre))continue;

                var hayTraslape = await _db.HorariosInstitucionales.AnyAsync(h =>
                h.IdEspacio == body.IdEspacio &&
                h.IdCiclo == cicloId &&
                h.DiaSemana == diaNombre &&
                hi < h.HoraFin &&
                hf > h.HoraInicio);

                if (hayTraslape)
               { 
                    return Conflict(new { error = $"Ya existe un horario institucional en {diaNombre} que se traslapa con {hi:HH:mm}-{hf:HH:mm}" });
               }

               creados.Add(new HorarioInstitucionalModel
            {
                    IdCiclo = cicloId,
                    IdEspacio = body.IdEspacio,
                    DiaSemana = diaNombre,
                    HoraInicio = hi,
                    HoraFin = hf,
                    Asignatura = body.Asignatura.Trim(),
                    DocenteTitular = body.DocenteTitular.Trim()
                });
        }
        if (creados.Count == 0)
        {
            return BadRequest(new { error = "Días inválidos (usa 1=lunes a 6=sabado)"});
        }

        _db.HorariosInstitucionales.AddRange(creados);
        await _db.SaveChangesAsync();

        return Ok(new { ids_horarios = creados.Select(x => x.IdHorario).ToList() });
    }
}
