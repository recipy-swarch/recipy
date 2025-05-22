// 02-init-comments.js
db = db.getSiblingDB('recipy');                  // Cambia a la BD "recipy"

// Asegura la colección "comentarios"
db.createCollection('comments');

// Índice para consultar comentarios por receta
db.comments.createIndex({ recipe_id: 1 });

// Índice para consultar respuestas anidadas
db.comments.createIndex({ parent_id: 1 });

// (Opcional) Índice por usuario
db.comments.createIndex({ user_id: 1 });
