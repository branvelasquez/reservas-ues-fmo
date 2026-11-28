namespace ReservasApi.Models;

public class SolicitudExcepcionalModel
{
    public int IdSolicitud { get; set; }
    public string AutoridadNombre { get; set; } = string.Empty;
    public string AutoridadCargo { get; set; } = string.Empty;
    public string Justificacion { get; set; } = string.Empty;
    public int? IdSolicitudAfectada { get; set; }
    public string? AlternativaOfrecida { get; set; }

    public SolicitudModel? Solicitud { get; set; }
    public SolicitudModel? SolicitudAfectada { get; set; }
}