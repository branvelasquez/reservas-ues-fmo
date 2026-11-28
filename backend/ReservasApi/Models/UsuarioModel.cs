namespace ReservasApi.Models;

public class UsuarioModel
{
    public int IdUsuario { get; set; }
    public short IdRol { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string CorreoInstitucional { get; set; } = string.Empty;
    public string ContrasenaHash { get; set; } = string.Empty;
    public string EstadoCuenta { get; set; } = "pendiente_verificacion";
    public int? IdCarrera { get; set; }
    public int? IdArea { get; set; }
    public DateTime CreadoEn { get; set; }

    public RolModel? Rol { get; set; }
    public CarreraModel? Carrera { get; set; }
    public AreaAcademicaModel? AreaAcademica { get; set; }

    public ICollection<TokenCorreoModel> TokensCorreo { get; set; } = new List<TokenCorreoModel>();
    public ICollection<EspacioModel> EspaciosEncargados { get; set; } = new List<EspacioModel>();
    public ICollection<IncidenciaModel> IncidenciasReportadas { get; set; } = new List<IncidenciaModel>();
    public ICollection<BloqueoModel> BloqueosCreados { get; set; } = new List<BloqueoModel>();
    public ICollection<SolicitudModel> Solicitudes { get; set; } = new List<SolicitudModel>();
    public ICollection<DecisionModel> Decisiones { get; set; } = new List<DecisionModel>();
    public ICollection<HistorialEstadoModel> HistorialesEstado { get; set; } = new List<HistorialEstadoModel>();
    public ICollection<UsoEspacioModel> UsosEspacio { get; set; } = new List<UsoEspacioModel>();
    public ICollection<NotificacionModel> Notificaciones { get; set; } = new List<NotificacionModel>();
    public ICollection<BitacoraModel> Bitacoras { get; set; } = new List<BitacoraModel>();
}