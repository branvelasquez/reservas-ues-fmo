namespace ReservasApi.Models;

public class BitacoraModel
{
    public int IdBitacora { get; set; }
    public int IdUsuario { get; set; }
    public string Accion { get; set; } = string.Empty;
    public string Entidad { get; set; } = string.Empty;
    public int? IdEntidad { get; set; }
    public DateTime FechaHora { get; set; }

    public UsuarioModel? Usuario { get; set; }
}