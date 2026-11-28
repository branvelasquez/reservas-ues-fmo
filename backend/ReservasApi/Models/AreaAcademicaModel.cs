namespace ReservasApi.Models;

public class AreaAcademicaModel
{
    public int IdArea { get; set; }
    public string Nombre { get; set; } = string.Empty;

    public ICollection<UsuarioModel> Usuarios { get; set; } = new List<UsuarioModel>();
    public ICollection<AccesoEspacioModel> AccesosEspacio { get; set; } = new List<AccesoEspacioModel>();
}