using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ReservasApi.Data;

namespace ReservasApi.Controllers;

[ApiController]
[Route("api/espacios")]
[Authorize]
public class EspaciosController : ControllerBase
{
    private readonly ReservasDbContext _db;
    public EspaciosController(ReservasDbContext db) 
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? busqueda, [FromQuery] string? tipo)
    {
        var q = _db.Espacios.AsNoTracking()
            .Include(e => e.Encargado)
            .Where(e => e.Estado == "activo");

        if (!string.IsNullOrWhiteSpace(tipo) && tipo != "Todos")
        {
            q = q.Where(e => e.Tipo.Contains(tipo));
        }
        if (!string.IsNullOrWhiteSpace(busqueda))
        {
            var b = busqueda.ToLower();
            q = q.Where(e => e.Nombre.ToLower().Contains(b) || e.Ubicacion.ToLower().Contains(b));
        }

        var list = await q.OrderBy(e => e.Nombre).Select(e => new
        {
            id_espacio = e.IdEspacio,
            nombre_espacio = e.Nombre,
            ubicacion_espacio = e.Ubicacion,
            capacidad_espacio = e.Capacidad,
            activo = e.Estado == "activo",
            nombre_tipo = e.Tipo,
            encargado = e.Encargado != null ? e.Encargado.Nombre : null
        }).ToListAsync();

        return Ok(list);
    }
}
