namespace ReservasApi.Models;

public class HorarioInstitucionalModel
{
    public int IdHorario { get; set; }
    public int IdCiclo { get; set; }
    public int IdEspacio { get; set; }
    public string DiaSemana { get; set; } = string.Empty;
    public TimeOnly HoraInicio { get; set; }
    public TimeOnly HoraFin { get; set; }
    public string Asignatura { get; set; } = string.Empty;
    public string DocenteTitular { get; set; } = string.Empty;

    public CicloModel? Ciclo { get; set; }
    public EspacioModel? Espacio { get; set; }
}