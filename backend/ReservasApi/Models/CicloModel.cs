namespace ReservasApi.Models;

public class CicloModel
{
    public int IdCiclo { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public DateOnly FechaInicio { get; set; }
    public DateOnly FechaFin { get; set; }

    public ICollection<HorarioInstitucionalModel> HorariosInstitucionales { get; set; } = new List<HorarioInstitucionalModel>();
}