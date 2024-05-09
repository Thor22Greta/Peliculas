const mongoose = require('mongoose');

const peliculaSchema = mongoose.Schema({
    nombre_pelicula: String,
    año_pelicula: Number,
    director_pelicula: String,
    actores: [String],
    img: String,
    usuario_agregado: Number
});

module.exports = mongoose.model('Pelicula', peliculaSchema);