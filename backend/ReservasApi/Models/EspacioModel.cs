namespace ReservasApi.Models;

public class EspacioModel
{
    public int IdEspacio { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Tipo { get; set; } = string.Empty;
    public string Ubicacion { get; set; } = string.Empty;
    public int Capacidad { get; set; }
    public string Estado { get; set; } = "activo";
    public int IdEncargado { get; set; }

    public UsuarioModel? Encargado { get; set; }
    public ICollection<AccesoEspacioModel> Accesos { get; set; } = new List<AccesoEspacioModel>();
    public ICollection<EquipoModel> Equipos { get; set; } = new List<EquipoModel>();
    public ICollection<HorarioInstitucionalModel> HorariosInstitucionales { get; set; } = new List<HorarioInstitucionalModel>();
    public ICollection<BloqueoModel> Bloqueos { get; set; } = new List<BloqueoModel>();
    public ICollection<SolicitudModel> Solicitudes { get; set; } = new List<SolicitudModel>();
}