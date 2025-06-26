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

    waitRabbit(cfg.AMQPURL)

    log.Println("Iniciando consumidor AMQP en cola 'send-email'")
    startAMQPConsumer(cfg)
}
