namespace ReservasApi.Models;

public class AccesoEspacioModel
{
    public int IdAcceso { get; set; }
    public int IdEspacio { get; set; }
    public int? IdCarrera { get; set; }
    public int? IdArea { get; set; }

    public EspacioModel? Espacio { get; set; }
    public CarreraModel? Carrera { get; set; }
    public AreaAcademicaModel? AreaAcademica { get; set; }
}