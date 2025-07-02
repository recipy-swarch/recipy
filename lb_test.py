import subprocess
import time
import requests
import concurrent.futures
import sys
import signal
from collections import Counter, defaultdict

# 1) URL de tu load‑balancer para image‑ms
LB_URL = "http://localhost:83/health"

# 2) Servicio de Docker Compose a tail‑ear
SERVICE = "image-ms"

# 3) Número de peticiones a generar
COUNT = 1000

def send_request(url: str):
    """
    Envía una GET a la URL, mide la latencia, y extrae la réplica que responde.
    Se asume que el endpoint /health devuelve JSON con un campo 'instance'
    o envía un header 'X-Instance-ID'.
    """
    start = time.perf_counter()
    try:
        resp = requests.get(url, timeout=5)
        elapsed = (time.perf_counter() - start) * 1000  # ms
        # Intentamos extraer la réplica desde el body JSON
        replica = None
        try:
            data = resp.json()
            replica = data.get("instance") or data.get("node")  # ajustar clave según implementación
        except ValueError:
            pass
        # O desde la cabecera
        if not replica:
            replica = resp.headers.get("X-Instance-ID", "unknown")
        return {
            "status": resp.status_code,
            "latency_ms": elapsed,
            "replica": replica
        }
    except Exception as e:
        elapsed = (time.perf_counter() - start) * 1000
        return {
            "status": None,
            "latency_ms": elapsed,
            "replica": "error",
            "error": str(e)
        }

def main():
    # 1) Arrancamos el tail de logs en background
    print(f"📄 Iniciando tail de logs del servicio '{SERVICE}'…")
    log_proc = subprocess.Popen(
        ["docker", "compose", "logs", "-f", SERVICE],
        stdout=sys.stdout,
        stderr=sys.stderr
    )

    # 2) Pequeña espera para asegurar que el tail está activo
    time.sleep(2)

    # 3) Lanzamos las peticiones concurrentes
    print(f"🚀 Lanzando {COUNT} peticiones a {LB_URL}")
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
        futures = [executor.submit(send_request, LB_URL) for _ in range(COUNT)]
        for fut in concurrent.futures.as_completed(futures):
            results.append(fut.result())

    # 4) Un par de segundos más para que aparezcan los últimos logs
    time.sleep(2)

    # 5) Detenemos el tail de logs
    print("🛑 Deteniendo tail de logs")
    log_proc.send_signal(signal.SIGINT)
    time.sleep(1)
    if log_proc.poll() is None:
        log_proc.kill()

    # 6) Resumen de resultados
    latencies = [r["latency_ms"] for r in results if r["status"] is not None]
    errors = [r for r in results if r["status"] is None]
    by_replica = Counter(r["replica"] for r in results)

    print("\n📊 Resumen de la prueba:")
    print(f"Total peticiones: {len(results)}")
    print(f"  Éxitos: {len(latencies)}")
    print(f"  Errores: {len(errors)}")
    if latencies:
        print(f"Latency (ms): min={min(latencies):.1f}, max={max(latencies):.1f}, avg={sum(latencies)/len(latencies):.1f}")
    print("\nDistribución por réplica:")
    for replica, count in by_replica.items():
        print(f"  {replica}: {count} peticiones")

    if errors:
        print("\nAlgunos errores:")
        for e in errors[:5]:
            print(f"  Error en petición: {e.get('error')} (lat {e['latency_ms']:.1f} ms)")

    print("\n✅ ¡Prueba completada!")

if __name__ == "__main__":
    main()
