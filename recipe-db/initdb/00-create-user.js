db = db.getSiblingDB(process.env.MONGO_INITDB_DATABASE);

db.createUser({
  user: process.env.RECIPE_USER,
  pwd:  process.env.RECIPE_PWD,
  roles: [
    { role: "readWrite", db: process.env.MONGO_INITDB_DATABASE }
  ]
});