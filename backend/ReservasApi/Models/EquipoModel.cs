namespace ReservasApi.Models;

public class EquipoModel
{
    public int IdEquipo { get; set; }
    public int IdEspacio { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Estado { get; set; } = "disponible";

    public EspacioModel? Espacio { get; set; }
    public ICollection<IncidenciaModel> Incidencias { get; set; } = new List<IncidenciaModel>();
}