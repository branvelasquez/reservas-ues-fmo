namespace ReservasApi.Models;

public class CarreraModel
{
    public int IdCarrera { get; set; }
    public string Nombre { get; set; } = string.Empty;

    public ICollection<UsuarioModel> Usuarios { get; set; } = new List<UsuarioModel>();
    public ICollection<AccesoEspacioModel> AccesosEspacio { get; set; } = new List<AccesoEspacioModel>();
    public ICollection<SolicitudModel> Solicitudes { get; set; } = new List<SolicitudModel>();
}