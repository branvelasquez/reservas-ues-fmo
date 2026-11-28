namespace ReservasApi.Models;

public class CambioSolicitudModel
{
    public int IdCambio { get; set; }
    public int IdSolicitud { get; set; }
    public DateOnly NuevaFecha { get; set; }
    public TimeOnly NuevaHoraInicio { get; set; }
    public TimeOnly NuevaHoraFin { get; set; }
    public string Estado { get; set; } = "pendiente";
    public DateTime FechaSolicitud { get; set; }

    public SolicitudModel? Solicitud { get; set; }
    public DecisionModel? Decision { get; set; }
}