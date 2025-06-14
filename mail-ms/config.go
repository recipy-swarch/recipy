package main

type Config struct {
    SMTPHost string `envconfig:"MAIL_SMTP_HOST" required:"true"`
    SMTPPort int    `envconfig:"MAIL_SMTP_PORT" required:"true"`
    SMTPUser string `envconfig:"MAIL_SMTP_USER" required:"true"`
    SMTPPass string `envconfig:"MAIL_SMTP_PASS" required:"true"`
    AMQPURL  string `envconfig:"AMQP_URL" required:"true"`
}
