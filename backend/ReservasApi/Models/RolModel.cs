namespace ReservasApi.Models;

public class RolModel
{
    public short IdRol { get; set; }
    public string NombreRol { get; set; } = string.Empty;

    public ICollection<UsuarioModel> Usuarios { get; set; } = new List<UsuarioModel>();
}