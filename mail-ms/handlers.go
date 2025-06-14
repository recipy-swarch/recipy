package main

import (
    "log"
    gomail "gopkg.in/gomail.v2"
)

func sendEmail(cfg Config, to, subject, body string) error {
    m := gomail.NewMessage()
    m.SetHeader("From", cfg.SMTPUser)
    m.SetHeader("To", to)
    m.SetHeader("Subject", subject)
    m.SetBody("text/html", body)

    d := gomail.NewDialer(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUser, cfg.SMTPPass)

    if err := d.DialAndSend(m); err != nil {
        log.Printf("Error enviando correo a %s: %v", to, err)
        return err
    }

    log.Printf("Correo enviado a %s", to)
    return nil
}
