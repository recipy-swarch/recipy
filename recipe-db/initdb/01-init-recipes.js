// Selecciona la base de datos "recipy"
db = db.getSiblingDB('recipy');

// Asegura la colección (la crea si no existe)
db.createCollection('recipes');

// Índice por fecha de creación (descendente)
db.recipes.createIndex({ created_at: -1 });

// Índices de texto para búsquedas por título, descripción e ingredientes
db.recipes.createIndex(
  { title: "text", description: "text", ingredients: "text" },
  { default_language: "spanish" }
);

// (Opcional) Precarga de documentos de ejemplo
