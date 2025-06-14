using Microsoft.AspNetCore.Mvc;
//using Microsoft.Extensions.Configuration;
using System.IO;
using System.Net.Mime;
using System.Security.Cryptography;    // ← añadir
using System;                         // ← para Convert

namespace image_ms.Controllers;

[ApiController]
[Route("[controller]")]
public class ImageController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    //private readonly string _apiGatewayUrl;

    //public ImageController(IWebHostEnvironment env, IConfiguration config)
    public ImageController(IWebHostEnvironment env)
    {
        _env = env;
        //_apiGatewayUrl = config["Image:API_GATEWAY_URL"];
    }

    /// <summary>
    /// Sube una imagen al servidor.
    /// </summary>
    [HttpPost("upload")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload(
        IFormFile image,
        [FromForm] string type,
        [FromForm] string id)
    {
        if (image is null || image.Length == 0)
            return BadRequest("No image uploaded.");
        if (string.IsNullOrWhiteSpace(type) || string.IsNullOrWhiteSpace(id))
            return BadRequest("Missing type or id.");

        var uploadsRoot = Path.Combine(_env.WebRootPath ?? "wwwroot", "uploads", type, id);
        Directory.CreateDirectory(uploadsRoot);

        // Leemos todo el contenido en memoria para calcular el hash
        await using var ms = new MemoryStream();
        await image.CopyToAsync(ms);
        var bytes = ms.ToArray();

        // Calculamos SHA-256 y lo usamos como nombre de archivo
        using var sha = SHA256.Create();
        var hashBytes = sha.ComputeHash(bytes);
        var hash = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
        var ext = Path.GetExtension(image.FileName).ToLowerInvariant();
        var fileName = $"{hash}{ext}";

        // Guardamos el fichero con el nombre basado en el hash
        var filePath = Path.Combine(uploadsRoot, fileName);
        await System.IO.File.WriteAllBytesAsync(filePath, bytes);

        //var link = $"{_apiGatewayUrl}/uploads/{type}/{id}/{fileName}";
        var link = $"/api/image/uploads/{type}/{id}/{fileName}"; // Cambios para coincidir con el API del frontend
        return Ok(new { link, hash });
    }

    /// <summary>
    /// Obtiene una imagen del servidor. usando la API. Pero usualmente se accede directamente al archivo.
    /// </summary>
    [HttpGet("{type}/{id}/{filename}")]
    public IActionResult GetImage(string type, string id, string filename)
    {
        var filePath = Path.Combine(_env.WebRootPath ?? "wwwroot", "uploads", type, id, filename);
        if (!System.IO.File.Exists(filePath))
            return NotFound("Image not found.");

        // Calcular SHA-256
        using var sha = SHA256.Create();
        using var fsHash = System.IO.File.OpenRead(filePath);
        var hash = BitConverter.ToString(sha.ComputeHash(fsHash)).Replace("-", "").ToLowerInvariant();
        Response.Headers.Add("X-Content-Sha256", hash); // Este se añade al header de la respuesta

        var contentType = GetContentType(filePath);
        return PhysicalFile(filePath, contentType);
    }

    /// <summary>
    /// Lista todas las imágenes subidas para un tipo e id.
    /// </summary>
    [HttpGet("{type}/{id}")]
    public IActionResult ListImages(string type, string id)
    {
        var uploadsRoot = Path.Combine(_env.WebRootPath ?? "wwwroot", "uploads", type, id);
        if (!Directory.Exists(uploadsRoot))
            return NotFound(new { message = "No existen imágenes para ese tipo/id." });

        var files = Directory
            .EnumerateFiles(uploadsRoot)
            .Select(fn =>
            {
                var name = Path.GetFileName(fn);
                //var link = $"{_apiGatewayUrl}/uploads/{type}/{id}/{name}";
                var link = $"/api/image/uploads/{type}/{id}/{name}"; // Cambios para coincidir con el API del frontend

                // Calcular SHA-256
                using var sha = SHA256.Create();
                using var fsHash = System.IO.File.OpenRead(fn);
                var hash = BitConverter.ToString(sha.ComputeHash(fsHash)).Replace("-", "").ToLowerInvariant();

                return new { name, link, hash };
            })
            .ToArray();

        return Ok(files);
    }

    /// <summary>
    /// Elimina un archivo específico.
    /// </summary>
    [HttpDelete("{type}/{id}/{filename}")]
    public IActionResult DeleteImage(string type, string id, string filename)
    {
        var uploadsRoot = Path.Combine(_env.WebRootPath ?? "wwwroot", "uploads", type, id);
        var filePath = Path.Combine(uploadsRoot, filename);
        if (!System.IO.File.Exists(filePath))
            return NotFound(new { message = "Image not found." });

        System.IO.File.Delete(filePath);
        return NoContent();
    }

    /// <summary>
    /// Elimina todas las imágenes de un tipo e id (borra la carpeta).
    /// </summary>
    [HttpDelete("{type}/{id}")]
    public IActionResult DeleteImagesById(string type, string id)
    {
        var uploadsRoot = Path.Combine(_env.WebRootPath ?? "wwwroot", "uploads", type, id);
        if (!Directory.Exists(uploadsRoot))
            return NotFound(new { message = "No existen imágenes para ese tipo/id." });

        Directory.Delete(uploadsRoot, recursive: true);
        return NoContent();
    }

    private static string GetContentType(string path)
    {
        var ext = Path.GetExtension(path).ToLowerInvariant();
        return ext switch
        {
            ".jpg" or ".jpeg" => MediaTypeNames.Image.Jpeg,
            ".png" => "image/png",
            ".gif" => MediaTypeNames.Image.Gif,
            _ => MediaTypeNames.Application.Octet
        };
    }
}
