#!/bin/bash

function detener_contenedores() {
    echo "Deteniendo contenedores..."
    sudo docker compose down
}

function eliminar_contenedores() {
    echo "Eliminando contenedores..."
    sudo docker compose rm
}

function construir_imagenes() {
    echo "Construyendo imágenes..."
    sudo docker compose build
}

function correr_contenedores() {
    echo "Iniciando contenedores..."
    sudo docker compose up
}

function eliminar_bases_datos() {
    echo "Eliminando bases de datos..."
    rm -rf recipe-db/data userauth-db/data userauth-db/pgdata 
    echo "Bases de datos eliminadas."
}

while true; do
    echo ""
    echo "Selecciona una opción:"
    echo "1. Detener contenedores"
    echo "2. Eliminar contenedores"
    echo "3. Construir las imágenes"
    echo "4. Correr los contenedores"
    echo "5. Eliminar bases de datos"
    echo "6. Salir"
    read -p "Opción: " opcion

    case $opcion in
        1)
            detener_contenedores
            ;;
        2)
            eliminar_contenedores
            ;;
        3)
            construir_imagenes
            ;;
        4)
            correr_contenedores
            ;;
        5)
            eliminar_bases_datos
            ;;
        6)
            echo "Saliendo..."
            break
            ;;
        *)
            echo "Opción inválida. Intenta nuevamente."
            ;;
    esac
done