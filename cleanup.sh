#!/bin/bash

function detener_contenedores() {
    echo "Deteniendo contenedores..."
    sudo docker compose down
}

function eliminar_contenedores() {
    echo "Eliminando contenedores..."
    sudo docker compose rm
    echo "Eliminando contenedore no usados..."
    sudo docker container prune -f
    echo "Eliminando imágenes no usadas..."
    sudo docker image prune -f
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

function corregir_permisos_image_ms() {
    echo "Corrigiendo permisos del volumen de la imagen recipe-ms..."
    mkdir -p image-ms/uploads
    sudo chown -R 1000:1000 image-ms/uploads
    sudo chmod -R 777 image-ms/uploads
}

while true; do
    echo ""
    echo "Selecciona una opción:"
    echo "1. Detener contenedores"
    echo "2. Eliminar contenedores, e imágenes no usadas"
    echo "3. Construir las imágenes"
    echo "4. Correr los contenedores"
    echo "5. Corregir permisos del volumen recipe-ms"
    echo "6. Eliminar bases de datos"
    echo "0. Salir"
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
            corregir_permisos_image_ms
            ;;
        6)
            eliminar_bases_datos
            ;;
        0)
            echo "Saliendo..."
            break
            ;;
        *)
            echo "Opción inválida. Intenta nuevamente."
            ;;
    esac
done