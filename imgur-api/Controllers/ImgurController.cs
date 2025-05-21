// filepath: /home/juan-david/Recipy/imgur/app/imgur-api/Controllers/ImgurController.cs
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Mvc;

namespace imgur_api.Controllers;

[ApiController]
[Route("[controller]")]
public class ImgurController : ControllerBase
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly string _clientId;

    public ImgurController(IHttpClientFactory httpFactory, IConfiguration config)
    {
        _httpFactory = httpFactory;
        _clientId = config["Imgur:ClientId"]!;
    }

    [HttpPost("upload")]
    public async Task<IActionResult> Upload(
        [FromForm] IFormFile image,
        [FromForm] string? title,
        [FromForm] string? description)
    {
        if (image is null || image.Length == 0)
            return BadRequest("No se envió ninguna imagen.");

        using var content = new MultipartFormDataContent();
        var stream = new StreamContent(image.OpenReadStream());
        stream.Headers.ContentType = MediaTypeHeaderValue.Parse(image.ContentType);
        content.Add(stream, "image", image.FileName);
        content.Add(new StringContent("file"), "type");
        if (!string.IsNullOrEmpty(title))
            content.Add(new StringContent(title), "title");
        if (!string.IsNullOrEmpty(description))
            content.Add(new StringContent(description), "description");

        var client = _httpFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Client-ID", _clientId);

        var resp = await client.PostAsync("https://api.imgur.com/3/image", content);
        var json = await resp.Content.ReadAsStringAsync();
        return StatusCode((int)resp.StatusCode, json);
    }
}