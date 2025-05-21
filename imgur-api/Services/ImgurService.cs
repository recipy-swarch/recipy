using Imgur;
using Imgur.Models; // Asegúrate de tener esto si es necesario
using Microsoft.Extensions.Configuration;

namespace ImgurUploader.Services;

public class ImgurService
{
    private readonly string _clientId;
    private readonly string _clientSecret;

    public ImgurService(IConfiguration config)
    {
        _clientId = config["Imgur:ClientId"]!;
        _clientSecret = config["Imgur:ClientSecret"]!;
    }

    public async Task<string> UploadImageAsync(Stream imageStream)
    {
        using var ms = new MemoryStream();
        await imageStream.CopyToAsync(ms);
        var imageBytes = ms.ToArray();

        using var client = new ImgurClient
        {
            ClientId = _clientId,
            ClientSecret = _clientSecret
        };

        var response = await client.Image.UploadAsync(new UploadImageRequest
        {
            Image = imageBytes,
            Type = "file" // o "base64" si envías base64
        });

        return response.Link;
    }
}
