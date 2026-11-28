namespace ReservasApi.Models;

public class TokenCorreoModel
{
    public int IdToken { get; set; }
    public int IdUsuario { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public string Codigo { get; set; } = string.Empty;
    public DateTime FechaExpira { get; set; }
    public bool Usado { get; set; }
    public DateTime CreadoEn { get; set; }

    public UsuarioModel? Usuario { get; set; }
}