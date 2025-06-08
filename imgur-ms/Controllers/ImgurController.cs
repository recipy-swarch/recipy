using Microsoft.AspNetCore.Mvc;
using System.IO;
using System.Net.Mime;

namespace imgur_ms.Controllers;

[ApiController]
[Route("[controller]")]
public class ImgurController : ControllerBase
{
    private readonly IWebHostEnvironment _env;

    public ImgurController(IWebHostEnvironment env)
    {
        _env = env;
    }

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

    [HttpGet("{type}/{id}/{filename}")]
    public IActionResult GetImage(string type, string id, string filename)
    {
        var filePath = Path.Combine(_env.WebRootPath ?? "wwwroot", "uploads", type, id, filename);
        if (!System.IO.File.Exists(filePath))
            return NotFound("Image not found.");

        var contentType = GetContentType(filePath);
        return PhysicalFile(filePath, contentType);
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
