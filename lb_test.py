"""
lb_test.py — Test de load‑balancing para image‑ms‑lb

Este script:
 1) Inicia un tail de logs en background para el servicio Docker Compose `image-ms`.
 2) Espera un par de segundos para estabilizar el tail.
 3) Lanza N peticiones concurrentes a la URL del balanceador.
 4) Espera a que terminen todas las peticiones.
 5) Da unos segundos extra para que los logs reflejen el tráfico.
 6) Termina el proceso de tail de logs.
"""

import subprocess
import time
import requests
import concurrent.futures
import sys
import os
import signal

# 1) URL de tu load‑balancer para image‑ms
LB_URL = "http://localhost:83/Image/user/1"

# 2) Servicio de Docker Compose a tail‑ear
SERVICE = "image-ms"

# 3) Número de peticiones a generar
COUNT = 1000

def send_request(url: str):
    """Envía una GET a la URL y descarta la respuesta."""
    try:
        requests.get(url, timeout=5)
    except Exception:
        pass  # ignoramos errores

def main():
    # 3.1) Arrancamos el tail de logs en background
    print(f"📄 Iniciando tail de logs del servicio '{SERVICE}'…")
    log_proc = subprocess.Popen(
        ["docker", "compose", "logs", "-f", SERVICE],
        stdout=sys.stdout,
        stderr=sys.stderr
    )

    # 4) Pequeña espera para asegurar que el tail está activo
    time.sleep(2)

    # 5) Lanzamos las peticiones concurrentes
    print(f"🚀 Lanzando {COUNT} peticiones a {LB_URL}")
    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
        # map espera a que todas las llamadas terminen
        list(executor.map(lambda _: send_request(LB_URL), range(COUNT)))

    # 6) Un par de segundos más para que aparezcan los últimos logs
    time.sleep(2)

    # 7) Detenemos el tail de logs
    print("🛑 Deteniendo tail de logs")
    # Enviamos SIGINT primero para un cierre más limpio
    log_proc.send_signal(signal.SIGINT)
    # si sigue vivo, forzamos
    time.sleep(1)
    if log_proc.poll() is None:
        log_proc.kill()

    print("✅ ¡Prueba completada!")

if __name__ == "__main__":
    main()
