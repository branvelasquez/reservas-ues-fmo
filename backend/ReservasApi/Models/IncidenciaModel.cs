namespace ReservasApi.Models;

public class IncidenciaModel
{
    public int IdIncidencia { get; set; }
    public int IdEquipo { get; set; }
    public int IdReporta { get; set; }
    public string Descripcion { get; set; } = string.Empty;
    public DateTime FechaReporte { get; set; }
    public string Estado { get; set; } = "abierta";
    public string? Solucion { get; set; }
    public DateTime? FechaSolucion { get; set; }

    public EquipoModel? Equipo { get; set; }
    public UsuarioModel? Reporta { get; set; }
}