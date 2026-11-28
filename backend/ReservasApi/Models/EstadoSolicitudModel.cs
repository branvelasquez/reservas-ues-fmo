namespace ReservasApi.Models;

public class EstadoSolicitudModel
{
    public short IdEstado { get; set; }
    public string CodigoEstado { get; set; } = string.Empty;
    public string NombreEstado { get; set; } = string.Empty;

    public ICollection<SolicitudModel> Solicitudes { get; set; } = new List<SolicitudModel>();
}