using Microsoft.AspNetCore.Mvc;
using System;

namespace Recipy.ImageMS.Controllers
{
    [ApiController]
    [Route("health")]
    public class HealthController : ControllerBase
    {
        [HttpGet]
        public IActionResult Get()
        {
            var hostname = Environment.MachineName;
            return Ok(new { status = "ok", instance = hostname });
        }
    }
}