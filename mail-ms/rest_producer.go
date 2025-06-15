package main

import (
    "encoding/json"
    "log"
    "math/rand"
    "net/http"
    "strconv"
    "time"

    "github.com/streadway/amqp"
)

type SendCodeRequest struct {
    To   string `json:"to"`
    Code string `json:"code,omitempty"`
}

type BulkEmailRequest struct {
    To      []string `json:"to"`
    Subject string   `json:"subject"`
    Body    string   `json:"body"`
}

func generateCode() string {
    rand.Seed(time.Now().UnixNano())
    return strconv.Itoa(100000 + rand.Intn(900000)) // 6 dígitos
}

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

        if err := publishToQueue(cfg, "send-email", msg); err != nil {
            http.Error(w, "Error publicando mensaje", http.StatusInternalServerError)
            return
        }

        w.WriteHeader(http.StatusAccepted)
        w.Write([]byte("Mensaje encolado correctamente"))
    })

    http.HandleFunc("/send-code", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost {
            http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
            return
        }

        var req SendCodeRequest
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
            http.Error(w, "Error al parsear JSON", http.StatusBadRequest)
            return
        }

        if req.Code == "" {
            req.Code = generateCode()
        }

        body := "<html><body><h3>Tu código de verificación es: <b>" + req.Code + "</b></h3></body></html>"
        msg := EmailMessage{
            To:      req.To,
            Subject: "Código de verificación",
            Body:    body,
        }

        if err := publishToQueue(cfg, "send-email", msg); err != nil {
            http.Error(w, "Error publicando mensaje", http.StatusInternalServerError)
            return
        }

        w.WriteHeader(http.StatusAccepted)
        w.Write([]byte("Código enviado correctamente"))
    })

    http.HandleFunc("/send-bulk", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost {
            http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
            return
        }

        var req BulkEmailRequest
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
            http.Error(w, "Error al parsear JSON", http.StatusBadRequest)
            return
        }

        for _, recipient := range req.To {
            msg := EmailMessage{
                To:      recipient,
                Subject: req.Subject,
                Body:    req.Body,
            }
            if err := publishToQueue(cfg, "send-email", msg); err != nil {
                log.Printf("Error publicando para %s: %v", recipient, err)
            }
        }

        w.WriteHeader(http.StatusAccepted)
        w.Write([]byte("Mensajes masivos encolados correctamente"))
    })

    log.Fatal(http.ListenAndServe(":8080", nil))
}

func publishToQueue(cfg Config, queueName string, msg EmailMessage) error {
    conn, err := amqp.Dial(cfg.AMQPURL)
    if err != nil {
        return err
    }
    defer conn.Close()

    ch, err := conn.Channel()
    if err != nil {
        return err
    }
    defer ch.Close()

    _, err = ch.QueueDeclare(queueName, true, false, false, false, nil)
    if err != nil {
        return err
    }

    body, err := json.Marshal(msg)
    if err != nil {
        return err
    }

    return ch.Publish(
        "", queueName, false, false,
        amqp.Publishing{
            ContentType: "application/json",
            Body:        body,
        },
    )
}
