package main

import (
    "encoding/json"
    "log"

    "github.com/streadway/amqp"
)

// EmailMessage representa el payload esperado en la cola "send-email".
type EmailMessage struct {
    To      string `json:"to"`
    Subject string `json:"subject"`
    Body    string `json:"body"`
}

// startAMQPConsumer arranca el consumidor AMQP tras establecer la conexión.
func startAMQPConsumer(cfg Config) {
    conn, err := amqp.Dial(cfg.AMQPURL)
    if err != nil {
        log.Fatalf("No se pudo conectar a RabbitMQ: %s", err)
    }
    defer conn.Close()

    ch, err := conn.Channel()
    if err != nil {
        log.Fatalf("No se pudo abrir canal AMQP: %s", err)
    }
    defer ch.Close()

    q, err := ch.QueueDeclare(
        "send-email", // nombre de la cola
        true,         // durable
        false,        // auto-delete
        false,        // exclusive
        false,        // no-wait
        nil,          // args
    )
    if err != nil {
        log.Fatalf("No se pudo declarar la cola: %s", err)
    }

    msgs, err := ch.Consume(
        q.Name, // queue
        "",     // consumer
        true,   // auto-ack
        false,  // exclusive
        false,  // no-local
        false,  // no-wait
        nil,    // args
    )
    if err != nil {
        log.Fatalf("No se pudo registrar el consumidor: %s", err)
    }

    for msg := range msgs {
        var email EmailMessage
        if err := json.Unmarshal(msg.Body, &email); err != nil {
            log.Printf("Error parseando mensaje: %v", err)
            continue
        }

        log.Printf("Enviando correo a %s…", email.To)
        if err := sendEmail(cfg, email.To, email.Subject, email.Body); err != nil {
            log.Printf("Falló el envío: %v", err)
        } else {
            log.Printf("Correo enviado a %s", email.To)
        }
    }
}
