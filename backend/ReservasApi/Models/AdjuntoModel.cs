namespace ReservasApi.Models;

public class AdjuntoModel
{
    public int IdAdjunto { get; set; }
    public int IdSolicitud { get; set; }
    public string NombreArchivo { get; set; } = string.Empty;
    public string Formato { get; set; } = string.Empty;
    public int TamanoBytes { get; set; }
    public string Ruta { get; set; } = string.Empty;

    public SolicitudModel? Solicitud { get; set; }
}