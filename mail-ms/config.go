package main

type Config struct {
    SMTPHost string `envconfig:"MAIL_SMTP_HOST" required:"true"`
    SMTPPort int    `envconfig:"MAIL_SMTP_PORT" required:"true"`
    SMTPUser string `envconfig:"MAIL_SMTP_USER"`
    SMTPPass string `envconfig:"MAIL_SMTP_PASS"`
    AMQPURL  string `envconfig:"AMQP_URL" required:"true"`
}
