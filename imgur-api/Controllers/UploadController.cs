using Microsoft.AspNetCore.Mvc;
using ImgurUploader.Services;

namespace ImgurUploader.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UploadController : ControllerBase
{
    private readonly ImgurService _imgurService;

    public UploadController(ImgurService imgurService)
    {
        _imgurService = imgurService;
    }

    [HttpPost]
    public async Task<IActionResult> UploadImage(IFormFile image)
    {
        if (image == null || image.Length == 0)
            return BadRequest("No image provided");

        using var stream = image.OpenReadStream();
        var link = await _imgurService.UploadImageAsync(stream);
        return Ok(new { link });
    }
}
