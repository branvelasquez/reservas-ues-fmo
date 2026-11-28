namespace ReservasApi.Models;

public class HistorialEstadoModel
{
    public int IdHistorial { get; set; }
    public int IdSolicitud { get; set; }
    public int IdUsuario { get; set; }
    public short? EstadoAnterior { get; set; }
    public short EstadoNuevo { get; set; }
    public string? Motivo { get; set; }
    public DateTime FechaHora { get; set; }

    public SolicitudModel? Solicitud { get; set; }
    public UsuarioModel? Usuario { get; set; }
    public EstadoSolicitudModel? EstadoAnteriorNavigation { get; set; }
    public EstadoSolicitudModel? EstadoNuevoNavigation { get; set; }
}