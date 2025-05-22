// Selecciona la base de datos "recipy"
db = db.getSiblingDB('recipy');

// Crea la colección "likes" si no existe
db.createCollection('likes');

// Índice para buscar “me gusta” por receta
db.likes.createIndex({ recipe_id: 1 });

// Índice para buscar “me gusta” por usuario
db.likes.createIndex({ user_id: 1 });
