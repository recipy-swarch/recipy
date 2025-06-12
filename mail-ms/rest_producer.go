package main

import (
    "encoding/json"
    "log"
    "net/http"

    "github.com/streadway/amqp"
)

func startRESTServer(cfg Config) {
    http.HandleFunc("/send", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost {
            http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
            return
        }

        var msg EmailMessage
        if err := json.NewDecoder(r.Body).Decode(&msg); err != nil {
            http.Error(w, "Error al parsear JSON", http.StatusBadRequest)
            return
        }

        conn, err := amqp.Dial(cfg.AMQPURL)
        if err != nil {
            http.Error(w, "Error conectando a RabbitMQ", http.StatusInternalServerError)
            return
        }
        defer conn.Close()

        ch, err := conn.Channel()
        if err != nil {
            http.Error(w, "Error abriendo canal", http.StatusInternalServerError)
            return
        }
        defer ch.Close()

        q, err := ch.QueueDeclare("send-email", true, false, false, false, nil)
        if err != nil {
            http.Error(w, "Error declarando cola", http.StatusInternalServerError)
            return
        }

        body, _ := json.Marshal(msg)

        err = ch.Publish(
            "",     // exchange
            q.Name, // routing key
            false,
            false,
            amqp.Publishing{
                ContentType: "application/json",
                Body:        body,
            },
        )
        if err != nil {
            http.Error(w, "Error publicando mensaje", http.StatusInternalServerError)
            return
        }

        w.WriteHeader(http.StatusAccepted)
        w.Write([]byte("Mensaje encolado correctamente"))
    })

    log.Fatal(http.ListenAndServe(":8080", nil))
}
