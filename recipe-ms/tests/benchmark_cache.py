#!/usr/bin/env python3
import subprocess
from datetime import datetime
from pathlib import Path

def run_benchmark(n=500, c=50, header_name="x-user-id", header_value="1",
                  url="http://localhost:8000/graphql/get_recipes"):
    """
    Ejecuta ApacheBench con los parámetros dados y guarda la salida en un archivo timestamped.
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = Path(__file__).parent / f"benchmark_{timestamp}.txt"
    cmd = [
        "ab",
        f"-n{n}",
        f"-c{c}",
        "-H", f"{header_name}: {header_value}",
        url
    ]
    print(f"Ejecutando: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    output_file.write_text(result.stdout)
    print(f"Salida guardada en: {output_file}")

if __name__ == "__main__":
    run_benchmark()
