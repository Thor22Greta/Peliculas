const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const PassportLocal = require('passport-local').Strategy;

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser('secreto'));
app.use(session({
    secret: 'secreto',
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

app.set('view engine', 'ejs');

mongoose.connect('mongodb://localhost:27017/cinema');

const Pelicula = require("./model/pelicula");
const Usuario = require("./model/usuario");

passport.use(new PassportLocal(async function(username, password, done){
    try {
        // Busca el usuario en la base de datos
        const usuario = await Usuario.findOne({ email: username });

        // Si el usuario no existe o la contraseña es incorrecta, devuelve falso
        if (!usuario || usuario.contraseña !== password) {
            return done(null, false);
        }

        // Si el usuario y la contraseña son correctos, devuelve el usuario
        return done(null, usuario);
    } catch (error) {
        return done(error);
    }
}));

passport.serializeUser(function(user, done){
    done(null, user.id);
});

passport.deserializeUser(function(id, done){
    Usuario.findById(id)
        .then(user => {
            done(null, user);
        })
        .catch(error => {
            done(error);
        });
});

app.get("/", (req, res, next) => {
    if(req.isAuthenticated()){
        return next();
    } 
    res.redirect('/login');
}, (req, res) => {
    res.send('Inicio');
})

app.get("/login", (req, res) => {
    res.render("login.ejs")
})

app.post("/login", passport.authenticate('local',{
    successRedirect: "/peliculas",
    failureRedirect: "/login"
}))

app.get('/peliculas', (req, res, next) => {
    if(req.isAuthenticated()){
        return next();
    } 
    res.redirect('/login');
}, async (req, res) => {
    try {
        const peliculas = await Pelicula.find();
        res.render('peliculas.ejs', { peliculas: peliculas, busqueda: "" }); // Definir la variable busqueda como una cadena vacía
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get("/buscar", async (req, res) => {
    try {
        let busqueda = req.query.busqueda;

        // Creamos un objeto de búsqueda que busca coincidencias en nombre, director y actores
        let query = {
            $or: [
                { nombre_pelicula: { $regex: new RegExp(busqueda, 'i') } },
                { director_pelicula: { $regex: new RegExp(busqueda, 'i') } },
                { actores: { $regex: new RegExp(busqueda, 'i') } }
            ]
        };

        // Si el valor de búsqueda es un número, también buscamos por año de película
        if (!isNaN(busqueda)) {
            query.$or.push({ año_pelicula: Number(busqueda) });
        }

        const peliculas = await Pelicula.find(query);

        res.render('peliculas.ejs', { peliculas: peliculas, busqueda: req.query.busqueda });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


app.get("/nuevaPelicula", (req, res) => {
    res.render("nuevaPelicula.ejs");
});

app.post("/guardarPelicula", async (req, res) => {
    try {
        const { nombre, año, director, actores, img } = req.body;

        // Obtener el número de usuario del usuario autenticado
        const numeroUsuario = req.user.numero_usuario;

        const nuevaPelicula = new Pelicula({
            nombre_pelicula: nombre,
            año_pelicula: año,
            director_pelicula: director,
            actores: actores.split(","),
            img: img,
            usuario_agregado: numeroUsuario // Asignar el número de usuario a usuario_agregado
        });

        await nuevaPelicula.save();

        res.redirect("/peliculas");
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


app.post("/eliminarPelicula", async (req, res) => {
    try {
        const idPelicula = req.body.idPelicula;
        const usuarioActual = req.user.numero_usuario; // Obtener el número de usuario del usuario autenticado

        // Buscar la película por su ID
        const pelicula = await Pelicula.findById(idPelicula);

        if (!pelicula) {
            return res.status(404).json({ message: "Pelicula no encontrada" });
        }

        // Verificar si el usuario autenticado tiene permiso para eliminar la película
        if (usuarioActual !== pelicula.usuario_agregado && usuarioActual !== 0) {
            return res.status(403).json({ message: "No tienes permiso para eliminar esta película" });
        }

        // Eliminar la película
        await Pelicula.findByIdAndDelete(idPelicula);

        res.redirect("/peliculas");
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Error de conexión a MongoDB:'));
db.once('open', function () {
    console.log('Conexión exitosa a MongoDB');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});

