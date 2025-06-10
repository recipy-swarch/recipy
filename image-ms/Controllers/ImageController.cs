using Microsoft.AspNetCore.Mvc;
using System.IO;
using System.Net.Mime;

namespace image_ms.Controllers;

[ApiController]
[Route("[controller]")]
public class ImageController : ControllerBase
{
    private readonly IWebHostEnvironment _env;

    public ImageController(IWebHostEnvironment env)
    {
        _env = env;
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

        var filePath = Path.Combine(uploadsRoot, image.FileName);

        using var stream = new FileStream(filePath, FileMode.Create);
        await image.CopyToAsync(stream);

        var url = $"{Request.Scheme}://{Request.Host}/uploads/{type}/{id}/{image.FileName}";
        return Ok(new { url });
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
                var url = $"{Request.Scheme}://{Request.Host}/uploads/{type}/{id}/{name}";
                return new { name, url };
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
