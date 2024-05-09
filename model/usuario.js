const mongoose = require('mongoose');

const usarioSchema = mongoose.Schema({
    nombre: String,
    contraseña: String,
    email: String,
    numero_usuario: Number
});

module.exports = mongoose.model('Usuario', usarioSchema);