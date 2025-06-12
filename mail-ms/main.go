package main

import (
    "log"
    "net/http"
    "os"

    "github.com/gin-gonic/gin"
    "github.com/kelseyhightower/envconfig"
)

type EmailRequest struct {
    To      string `json:"to" binding:"required"`
    Subject string `json:"subject" binding:"required"`
    Body    string `json:"body" binding:"required"`
}

func main() {
    var cfg Config
    if err := envconfig.Process("", &cfg); err != nil {
        log.Fatalf("Error cargando configuración: %s", err)
    }

    port := os.Getenv("MAIL_MS_PORT")
    if port == "" {
        port = "8080"
    }

    r := gin.Default()

    r.POST("/send", func(c *gin.Context) {
        var req EmailRequest
        if err := c.ShouldBindJSON(&req); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
            return
        }

        if err := sendEmail(cfg, req.To, req.Subject, req.Body); err != nil {
            c.JSON(http.StatusInternalServerError, gin.H{"error": "No se pudo enviar el correo"})
            return
        }

        c.JSON(http.StatusOK, gin.H{"message": "Correo enviado exitosamente"})
    })

    r.Run(":" + port)
}
a