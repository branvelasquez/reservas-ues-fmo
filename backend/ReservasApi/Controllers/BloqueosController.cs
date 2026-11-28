using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReservasApi.Data;
using ReservasApi.Models;

namespace ReservasApi.Controllers;

[ApiController]
[Route("api/bloqueos")]
[Authorize]
public class BloqueosController : ControllerBase
{
    private readonly ReservasDbContext _db;
    public BloqueosController(ReservasDbContext db)
    {
      _db = db;   
    }

    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
    private short RoleId => short.Parse(User.FindFirstValue(ClaimTypes.Role) ?? "4");

    [HttpGet]
    public async Task<IActionResult> Listar([FromQuery] int? id_espacio)
    {
        var q = _db.Bloqueos.AsNoTracking().Include(b => b.Espacio).Where(b => b.Activo);

        if (id_espacio is > 0)
        {
           q = q.Where(b => b.IdEspacio == id_espacio); 
        } 

        var list = await q.OrderByDescending(b => b.Inicio).Select(b => new
        {
            id_bloqueo = b.IdBloqueo,
            id_espacio = b.IdEspacio,
            nombre_espacio = b.Espacio!.Nombre,
            fecha_inicio = b.Inicio.ToString("yyyy-MM-dd HH:mm"),
            fecha_fin = b.Fin.ToString("yyyy-MM-dd HH:mm"),
            motivo_bloqueo = b.Motivo,
            activo = b.Activo
        }).ToListAsync();
        
        return Ok(list);
    }

    public record CrearBloqueoDto(int IdEspacio, string FechaInicio, string FechaFin, string MotivoBloqueo);

    [HttpPost]
    public async Task<IActionResult> Crear([FromBody] CrearBloqueoDto body)
    {
        if (RoleId != 3)
        {
            return Forbid();
        }
        if (!DateTime.TryParse(body.FechaInicio, out var ini) || !DateTime.TryParse(body.FechaFin, out var fin))
        {
            return BadRequest(new { error = "Fechas inválidas" });
        }   
        if (fin <= ini)
        {
            return BadRequest(new { error = "fecha_fin debe ser mayor que fecha_inicio" });  
        } 
        if (string.IsNullOrWhiteSpace(body.MotivoBloqueo))
        {
            return BadRequest(new { error = "El motivo es obligatorio" });
        }
            
        var b = new BloqueoModel
        {
            IdEspacio = body.IdEspacio,
            IdCreador = UserId,
            Inicio = ini,
            Fin = fin,
            Motivo = body.MotivoBloqueo.Trim(),
            Activo = true
        };
        _db.Bloqueos.Add(b);
        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
        {
            return Conflict(new { error = ex.InnerException?.Message ?? ex.Message });
        }
        return Ok(new { id_bloqueo = b.IdBloqueo });
    }
}
