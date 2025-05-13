db = db.getSiblingDB('recipy'); // Cambia a la BD "recipy"
db.createCollection('recipes'); // Asegura la colección
// Índices útiles para búsquedas por campos textuales
db.recetas.createIndex({ title: "text", description: "text", ingredients:
"text" });
// Aquí podemos precargar documentos de ejemplo