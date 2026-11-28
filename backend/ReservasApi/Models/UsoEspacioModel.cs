namespace ReservasApi.Models;

public class UsoEspacioModel
{
    public int IdUso { get; set; }
    public int IdSolicitud { get; set; }
    public int IdEncargado { get; set; }
    public string? Observacion { get; set; }
    public DateTime FechaRegistro { get; set; }

    public SolicitudModel? Solicitud { get; set; }
    public UsuarioModel? Encargado { get; set; }
}