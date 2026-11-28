using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using ReservasApi.Data;
using ReservasApi.Models;

namespace ReservasApi.Services;

public record AuthUserDto(int IdUsuario, string NombreUsuario, string CorreoUsuario, short IdRol, string NombreRol);
public record LoginResponse(string Token, AuthUserDto User);

public class AuthService
{
    private readonly ReservasDbContext _db;
    private readonly IConfiguration _cfg;

    private static readonly Dictionary<string, string> DemoPasswords = new(StringComparer.OrdinalIgnoreCase)
    {
        ["admin@ues.edu.sv"] = "Admin123!",
        ["encargada@ues.edu.sv"] = "Encargado123!",
        ["academica@ues.edu.sv"] = "Academica123!",
        ["docente1@ues.edu.sv"] = "Docente123!",
        ["docente2@ues.edu.sv"] = "Docente123!",
    };

    public AuthService(ReservasDbContext db, IConfiguration cfg)
    {
        _db = db;
        _cfg = cfg;
    }

    public async Task<LoginResponse?> LoginAsync(string correo, string pass)
    {
        var user = await _db.Usuarios.Include(u => u.Rol)
            .FirstOrDefaultAsync(u => u.CorreoInstitucional.ToLower() == correo.ToLower());
        if (user is null || user.EstadoCuenta == "desactivada") return null;
        if (!OkPassword(correo, pass, user.ContrasenaHash)) return null;

        var dto = new AuthUserDto(user.IdUsuario, user.Nombre, user.CorreoInstitucional, user.IdRol, user.Rol?.NombreRol ?? "");
        return new LoginResponse(MakeToken(dto), dto);
    }

    public async Task<AuthUserDto?> RegisterAsync(string nombre, string correo, string pass, short idRol = 1, int? idCarrera = null, int? idArea = null)
    {
        if (await _db.Usuarios.AnyAsync(u => u.CorreoInstitucional.ToLower() == correo.ToLower()))
            throw new InvalidOperationException("Ya existe un usuario con ese correo");

        var u = new UsuarioModel
        {
            IdRol = 4,
            Nombre = nombre,
            CorreoInstitucional = correo,
            ContrasenaHash = BCrypt.Net.BCrypt.HashPassword(pass),
            EstadoCuenta = "activa",
            IdCarrera = idCarrera,
            IdArea = idArea,
            CreadoEn = DateTime.UtcNow
        };
        _db.Usuarios.Add(u);
        await _db.SaveChangesAsync();
        await _db.Entry(u).Reference(x => x.Rol).LoadAsync();
        return new AuthUserDto(u.IdUsuario, u.Nombre, u.CorreoInstitucional, u.IdRol, u.Rol?.NombreRol ?? "");
    }

    private static bool OkPassword(string correo, string plain, string hash)
    {
        if (!string.IsNullOrEmpty(hash) && hash.StartsWith("$2")
            && !hash.Contains("REEMPLAZAR", StringComparison.OrdinalIgnoreCase))
        {
            try { if (BCrypt.Net.BCrypt.Verify(plain, hash)) return true; }
            catch { }
        }

        if (DemoPasswords.TryGetValue(correo.Trim(), out var expected) && plain == expected)
            return true;

        if (hash.Contains("REEMPLAZAR", StringComparison.OrdinalIgnoreCase) && plain == "Admin123!")
            return true;

        return false;
    }

    private string MakeToken(AuthUserDto u)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_cfg["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var hours = int.Parse(_cfg["Jwt:ExpiresHours"] ?? "8");
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, u.IdUsuario.ToString()),
            new Claim(ClaimTypes.Email, u.CorreoUsuario),
            new Claim(ClaimTypes.Name, u.NombreUsuario),
            new Claim(ClaimTypes.Role, u.IdRol.ToString()),
            new Claim("nombre_rol", u.NombreRol)
        };
        var token = new JwtSecurityToken(
            _cfg["Jwt:Issuer"], _cfg["Jwt:Audience"], claims,
            expires: DateTime.UtcNow.AddHours(hours), signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
