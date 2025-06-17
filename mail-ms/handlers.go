package main

import (
    "crypto/tls"
    "fmt"
    "log"
    "net/smtp"

    gomail "gopkg.in/gomail.v2"
)

func sendEmail(cfg Config, to, subject, body string) error {
    from := cfg.SMTPUser
    if from == "" {
        from = "no-reply@recipy.local"
    }

    // MailHog (puerto 1025): conexión en texto plano
    if cfg.SMTPPort == 1025 {
        msg := []byte(
            fmt.Sprintf("From: %s\r\n", from) +
                fmt.Sprintf("To: %s\r\n", to) +
                fmt.Sprintf("Subject: %s\r\n", subject) +
                "MIME-Version: 1.0\r\n" +
                "Content-Type: text/html; charset=UTF-8\r\n" +
                "\r\n" +
                body,
        )
        addr := fmt.Sprintf("%s:%d", cfg.SMTPHost, cfg.SMTPPort)
        if err := smtp.SendMail(addr, nil, from, []string{to}, msg); err != nil {
            log.Printf("Error enviando correo a %s (smtp): %v", to, err)
            return err
        }
        log.Printf("Correo enviado a %s via net/smtp", to)
        return nil
    }

    // Producción: gomail con TLS
    m := gomail.NewMessage()
    m.SetHeader("From", from)
    m.SetHeader("To", to)
    m.SetHeader("Subject", subject)
    m.SetBody("text/html", body)

    d := gomail.NewDialer(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPass)
    d.TLSConfig = &tls.Config{ServerName: cfg.SMTPHost}

    if err := d.DialAndSend(m); err != nil {
        log.Printf("Error enviando correo a %s (gomail): %v", to, err)
        return err
    }
    log.Printf("Correo enviado a %s via gomail", to)
    return nil
}
