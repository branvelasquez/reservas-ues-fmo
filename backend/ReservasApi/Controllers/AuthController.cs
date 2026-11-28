using System.Data.Common;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ReservasApi.Services;

namespace ReservasApi.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _auth;
    public AuthController(AuthService auth)
    {
        
        _auth = auth;   
    }

    public record LoginBody(string Correo, string Contrasenia);
    public record RegisterBody(string NombreUsuario, string CorreoUsuario, string Contrasenia, short IdRol = 1, int? IdCarrera = null, int? IdArea = null);

    [HttpPost("login")]
    [AllowAnonymous] //atributo que indica que no requiere autenticación ni autorización para ser accedido
    public async Task<IActionResult> Login([FromBody] LoginBody body)
    {
        if (string.IsNullOrWhiteSpace(body.Correo) || string.IsNullOrWhiteSpace(body.Contrasenia))
            return BadRequest(new { error = "Correo y contraseña requeridos" });
        
        var r = await _auth.LoginAsync(body.Correo, body.Contrasenia);
        if (r is null)
        {
             return Unauthorized(new { error = "Correo o contraseña incorrectos" });
        }
       
        return Ok(r);
    }

    [HttpPost("solicitar-acceso")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterBody body)
    {
        if(string.IsNullOrWhiteSpace(body.NombreUsuario) || string.IsNullOrWhiteSpace(body.CorreoUsuario) || string.IsNullOrWhiteSpace(body.Contrasenia))
        {
            return BadRequest(new {error = "Nombre, correo y contraseña requeridos"});
        }

        try
        {
            var u = await _auth.RegisterAsync(body.NombreUsuario, body.CorreoUsuario, body.Contrasenia, body.IdRol, body.IdCarrera, body.IdArea);
            
            return StatusCode(201, new { message = "Cuenta creada. Ya puedes iniciar sesión.", user = u });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }

    [HttpGet("me")]
    [Authorize]
    public IActionResult Me()
    {
        return Ok(new
        {
            id_usuario = User.FindFirstValue(ClaimTypes.NameIdentifier),
            nombre_usuario = User.FindFirstValue(ClaimTypes.Name),
            correo_usuario = User.FindFirstValue(ClaimTypes.Email),
            id_rol = User.FindFirstValue(ClaimTypes.Role),
            nombre_rol = User.FindFirstValue("nombre_rol")
        });
    }
}
