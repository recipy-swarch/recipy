package main

import (
    "log"

    "github.com/kelseyhightower/envconfig"
)

func main() {
    var cfg Config
    if err := envconfig.Process("", &cfg); err != nil {
        log.Fatalf("Error cargando configuración: %s", err)
    }

    // Aquí iniciarías la conexión AMQP, canal, consumidor, etc.
    log.Printf("Configuración cargada: %+v", cfg)

    // Ejemplo: startConsumer(ch, cfg)
}
