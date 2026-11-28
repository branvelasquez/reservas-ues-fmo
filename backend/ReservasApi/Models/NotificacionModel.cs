namespace ReservasApi.Models;

public class NotificacionModel
{
    public int IdNotificacion { get; set; }
    public int IdUsuario { get; set; }
    public int? IdSolicitud { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public string Asunto { get; set; } = string.Empty;
    public DateTime FechaEnvio { get; set; }
    public string EstadoEnvio { get; set; } = "enviada";

    public UsuarioModel? Usuario { get; set; }
    public SolicitudModel? Solicitud { get; set; }
}