from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

# ⚙️ Configuración del navegador
options = Options()
options.add_argument('--ignore-certificate-errors')
options.add_argument('--start-maximized')
options.set_capability("goog:loggingPrefs", {"browser": "ALL"})  # Para capturar logs del navegador

driver = webdriver.Chrome(options=options)

try:
    print("🔐 Iniciando sesión...")
    driver.get("https://localhost/login")
    driver.delete_all_cookies()
    driver.execute_script("window.localStorage.clear();")
    driver.refresh()

    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.ID, "email-form")))
    driver.find_element(By.ID, "email-form").send_keys("usuario1@correo.com")
    driver.find_element(By.ID, "password-form").send_keys("clavedetest9955")
    driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()

    WebDriverWait(driver, 10).until(lambda d: d.current_url != "https://localhost/login")
    print("✅ Redirigido a:", driver.current_url)

    print("⏳ Esperando que React sincronice token...")
    WebDriverWait(driver, 10).until(
        lambda d: d.execute_script("return localStorage.getItem('token') !== null")
    )
    time.sleep(1.5)

    print("📄 Accediendo a /create-recipe...")
    driver.get("https://localhost/create-recipe")

    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.ID, "title")))

    # ✍️ Llenar campos obligatorios
    driver.find_element(By.ID, "title").send_keys("Receta de prueba")
    driver.find_element(By.ID, "prepTime").send_keys("45 min")
    driver.find_element(By.ID, "portions").clear()
    driver.find_element(By.ID, "portions").send_keys("4")
    driver.find_element(By.ID, "description").send_keys("Descripción de receta test")

    driver.find_element(By.CSS_SELECTOR, "input[placeholder='Ej: 200g de harina']").send_keys("100g de harina")
    driver.find_element(By.CSS_SELECTOR, "textarea[placeholder='Describe un paso de la preparación...']").send_keys("Mezclar todo")

    # 📷 Subir imagen
    image_input = driver.find_element(By.CSS_SELECTOR, "input[type='file']")
    image_path = "./imagen-de-prueba.jpg"  # Ajusta ruta
    image_input.send_keys(image_path)
    print(f"🖼 Imagen cargada: {image_path}")

    time.sleep(1)

    # 🚀 Enviar formulario
    print("📤 Enviando formulario...")
    submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
    submit_btn.click()

    # ⏳ Esperar alerta de confirmación
    time.sleep(2)

    # 📋 Leer logs del navegador
    print("🧪 Logs del navegador:")
    logs = driver.get_log("browser")
    for entry in logs:
        if "🧪" in entry["message"]:
            print(entry["message"])

except Exception as e:
    print("❌ Error:", e)

finally:
    input("Presiona Enter para cerrar el navegador...")
    driver.quit()
