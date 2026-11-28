namespace ReservasApi.Models;

public class SolicitudModel
{
    public int IdSolicitud { get; set; }
    public int IdSolicitante { get; set; }
    public int IdEspacio { get; set; }
    public int? IdCarrera { get; set; }
    public DateOnly Fecha { get; set; }
    public TimeOnly HoraInicio { get; set; }
    public TimeOnly HoraFin { get; set; }
    public string Asignatura { get; set; } = string.Empty;
    public string DocenteResponsable { get; set; } = string.Empty;
    public int Participantes { get; set; }
    public string Motivo { get; set; } = string.Empty;
    public string Tipo { get; set; } = "ordinaria";
    public short IdEstado { get; set; } = 1;
    public DateTime FechaRegistro { get; set; }

    public UsuarioModel? Solicitante { get; set; }
    public EspacioModel? Espacio { get; set; }
    public CarreraModel? Carrera { get; set; }
    public EstadoSolicitudModel? EstadoSolicitud { get; set; }

    public ICollection<AdjuntoModel> Adjuntos { get; set; } = new List<AdjuntoModel>();
    public ICollection<CambioSolicitudModel> CambiosSolicitud { get; set; } = new List<CambioSolicitudModel>();
    public ICollection<DecisionModel> Decisiones { get; set; } = new List<DecisionModel>();
    public SolicitudExcepcionalModel? SolicitudExcepcional { get; set; }
    public ICollection<SolicitudExcepcionalModel> SolicitudesExcepcionalesAfectadas { get; set; } = new List<SolicitudExcepcionalModel>();
    public ICollection<HistorialEstadoModel> HistorialesEstado { get; set; } = new List<HistorialEstadoModel>();
    public ICollection<UsoEspacioModel> UsosEspacio { get; set; } = new List<UsoEspacioModel>();
    public ICollection<NotificacionModel> Notificaciones { get; set; } = new List<NotificacionModel>();
}