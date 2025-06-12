package main

import (
    "encoding/json"
    "log"

    "github.com/streadway/amqp"
)

type EmailMessage struct {
    To      string `json:"to"`
    Subject string `json:"subject"`
    Body    string `json:"body"`
}

func startAMQPConsumer(cfg Config) {
    conn, err := amqp.Dial(cfg.AMQPURL)
    if err != nil {
        log.Fatalf("No se pudo conectar a RabbitMQ: %s", err)
    }
    ch, err := conn.Channel()
    if err != nil {
        log.Fatalf("No se pudo abrir canal AMQP: %s", err)
    }

    q, err := ch.QueueDeclare("send-email", true, false, false, false, nil)
    if err != nil {
        log.Fatalf("No se pudo declarar la cola: %s", err)
    }

    msgs, err := ch.Consume(q.Name, "", true, false, false, false, nil)
    if err != nil {
        log.Fatalf("No se pudo registrar el consumidor: %s", err)
    }

    for msg := range msgs {
        var email EmailMessage
        if err := json.Unmarshal(msg.Body, &email); err != nil {
            log.Printf("Error parseando mensaje: %v", err)
            continue
        }

        log.Printf("Enviando correo a %s...", email.To)
        if err := sendEmail(cfg, email.To, email.Subject, email.Body); err != nil {
            log.Printf("Falló el envío: %v", err)
        }
    }
}
