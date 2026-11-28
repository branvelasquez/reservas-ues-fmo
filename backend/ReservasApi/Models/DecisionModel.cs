namespace ReservasApi.Models;

public class DecisionModel
{
    public int IdDecision { get; set; }
    public int IdSolicitud { get; set; }
    public int? IdCambio { get; set; }
    public string TipoDecision { get; set; } = string.Empty;
    public int IdEncargado { get; set; }
    public string Resultado { get; set; } = string.Empty;
    public string? Motivo { get; set; }
    public DateTime FechaHora { get; set; }

    public SolicitudModel? Solicitud { get; set; }
    public CambioSolicitudModel? CambioSolicitud { get; set; }
    public UsuarioModel? Encargado { get; set; }
}