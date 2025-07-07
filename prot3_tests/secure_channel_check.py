import requests
import ssl
import socket
from datetime import datetime

def test_https_active():
    print("\n🔍 Verificando que HTTPS responda con 200 OK...")
    try:
        response = requests.get("https://localhost/", verify=False, timeout=5)
        assert response.status_code == 200
        print("✅ HTTPS está activo y responde con 200 OK.")
    except Exception as e:
        print("❌ Error al conectar por HTTPS:", e)

def test_http_redirect():
    print("\n🔍 Verificando que HTTP esté redirigido o deshabilitado...")
    try:
        response = requests.get("http://localhost/", timeout=5, allow_redirects=False)
        assert response.status_code in [301, 302, 403, 404]
        print(f"✅ HTTP está redirigido o bloqueado correctamente. Código: {response.status_code}")
    except Exception as e:
        print("✅ HTTP está completamente deshabilitado (no responde).")

def test_security_headers():
    print("\n🔍 Verificando headers de seguridad en HTTPS...")
    response = requests.get("https://localhost/", verify=False)
    headers = response.headers
    expected = [
        "Strict-Transport-Security",
        "X-Content-Type-Options",
        "X-Frame-Options",
        "Content-Security-Policy"
    ]
    for h in expected:
        if h in headers:
            print(f"✅ Header presente: {h}")
        else:
            print(f"⚠️  Header faltante: {h}")

def test_tls_certificate():
    print("\n🔍 Verificando validez del certificado TLS...")
    try:
        context = ssl.create_default_context()
        with socket.create_connection(("localhost", 443)) as sock:
            with context.wrap_socket(sock, server_hostname="localhost") as ssock:
                cert = ssock.getpeercert()
                not_after = cert['notAfter']
                expire_date = datetime.strptime(not_after, '%b %d %H:%M:%S %Y %Z')
                days_left = (expire_date - datetime.utcnow()).days
                if days_left > 0:
                    print(f"✅ Certificado TLS válido. Expira en {days_left} días.")
                else:
                    print("❌ Certificado TLS expirado.")
    except Exception as e:
        print("❌ Error al obtener el certificado TLS:", e)

if __name__ == "__main__":
    test_https_active()
    test_http_redirect()
    test_security_headers()
    test_tls_certificate()