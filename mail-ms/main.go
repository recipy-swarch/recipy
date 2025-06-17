package main

import (
    "log"
    "time"

    "github.com/streadway/amqp"
    "github.com/kelseyhightower/envconfig"
)

func waitRabbit(url string) {
    for {
        conn, err := amqp.Dial(url)
        if err != nil {
            log.Printf("Esperando RabbitMQ… (%v)", err)
            time.Sleep(5 * time.Second)
            continue
        }
        conn.Close()
        log.Println("RabbitMQ está listo")
        return
    }
}

func main() {
    var cfg Config
    if err := envconfig.Process("", &cfg); err != nil {
        log.Fatalf("Error cargando configuración: %s", err)
    }

    // 1) Esperar a que RabbitMQ esté disponible
    waitRabbit(cfg.AMQPURL)

    // 2) Arrancar consumidor AMQP y servidor REST
    go startAMQPConsumer(cfg)
    go startRESTServer(cfg)

    log.Println("mail-ms escuchando en puerto interno 8080 (REST + AMQP)")
    select {} // bloquear el proceso principal indefinidamente
}
