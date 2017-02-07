const express = require('express');
const mongoose = require('mongoose');
const bluebird = require('bluebird');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const saltRounds = 10;
var session = require('express-session');
var uniqid = require('uniqid');
// const uuidV4 = require('uuid/v4');

// var token = uuidV4();


mongoose.Promise = bluebird;
mongoose.connect('mongodb://localhost/eCommerceProj');
const app = express();
var sess = {
    secret: "yo momma",
    cookie: {}
}

app.set('view engine', 'hbs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(session(sess));


const Product = mongoose.model('Product', {
    name: String,
    description: String,
    console: {
        type: String,
        enum: []
    },
    genre: String,
    brand: String,
    rating: {
        type: String,
        enum: []
    },
    inStockQuantity: Number,
    price: Number
});

const User = mongoose.model('User', {
    username: {
        type: String,
        required: true,
        index: {
            unique: true
        },
        ref: "Username"
    },
    email: {
        type: String,
        required: true
    },
    first_name: String,
    last_name: String,
    password: {
        type: String,
        required: true
    }
});

const Cart = mongoose.model('Cart', {
    username: String,
    product_id: {
        type: String,
        required: true
    }
});

var tokens = [];

function auth(req, res, next) {
    // console.log("Your token:", token);
    var sess = req.session;
    if (sess.username) {
        next();
    } else {
        res.status(401);
        res.json({
            error: "I hate You"
        });
    }
}


app.get('/signup', function(req, res) {
    res.render('signup.hbs');
})

app.post('/api/user/signup', function(req, res) {
    var u = new User({
        username: req.body.username,
        email: req.body.email,
        first_name: req.body.fname,
        last_name: req.body.lname,
        password: req.body.password
    });
    bcrypt.genSalt(saltRounds, function(err, salt) {
        bcrypt.hash(u.password, salt, function(err, hash) {
            console.log(hash);
            u.password = hash;
            console.log(hash);
            u.save(function(err) {
                if (err)
                    throw err;
                else
                    console.log('user saved');
            });
        });
    });
});


app.get('/', auth, function(req, res) {
    res.render('index.hbs')
    // console.log(token);
});

app.get('/login', function(req, res) {
    res.render('login.hbs')
});

app.post('/api/user/login', function(req, res) {
    var sess = req.session;
    var username = req.body.username;
    var password = req.body.password;
    console.log("session:");
    console.log(sess);
    User.findOne({
        username: username
    }, function(err, user) {
        if (err) throw err;
        bcrypt.compare(password, user.password, function(err, result) {
            if (err) throw err;
            else
                console.log("Signed in successfully");
            var token = uniqid();
            console.log(username);
            console.log(token);
            req.session.username = username;
            req.session.cart = [];
            req.session.token = token;
            res.json({
                username: username,
                token: token
            });
        });
    });
});

app.post('/add_game', function(req, res) {
    var p = new Product({
        name: req.body.game,
        description: req.body.desc,
        console: req.body.console,
        genre: req.body.genre,
        rating: req.body.rating,
        inStockQuantity: req.body.quantity,
        price: req.body.price
    });
    console.log('game is ');
    console.log(req.body.game);
    p.save(function(err) {
        if (err)
            throw err;
        else
            console.log('saved product successfully...');
    });
    res.render('index.hbs')
});

app.get('/api/products', function(req, res) {
    Product.find({})
        .then(function(docs) {
            console.log('results', docs);
        });
    // res.render('')
});

app.get('/api/product/:id', function(req, res) {
    var id = req.params.id;
    Product.findById(id)
        .then(function(docs) {
            console.log(docs);
        });
});

app.post('/api/shopping_cart', auth, function(req, res) {


});


// app.get('')

app.listen(3000, function() {
    console.log('3000!');
});
