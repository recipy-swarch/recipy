package main

import (
    "log"
    //"net/http"

    "github.com/kelseyhightower/envconfig"
)

func main() {
    var cfg Config
    if err := envconfig.Process("", &cfg); err != nil {
        log.Fatalf("Error cargando configuración: %s", err)
    }

    go startAMQPConsumer(cfg)
    go startRESTServer(cfg)

    log.Println("mail-ms escuchando en puerto interno 8080 (REST + AMQP)")
    select {} // evita que el main termine
}
