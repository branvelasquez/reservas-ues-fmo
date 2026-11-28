namespace ReservasApi.Models;

public class BloqueoModel
{
    public int IdBloqueo { get; set; }
    public int IdEspacio { get; set; }
    public int IdCreador { get; set; }
    public string Motivo { get; set; } = string.Empty;
    public DateTime Inicio { get; set; }
    public DateTime Fin { get; set; }
    public bool Activo { get; set; } = true;

    public EspacioModel? Espacio { get; set; }
    public UsuarioModel? Creador { get; set; }
}