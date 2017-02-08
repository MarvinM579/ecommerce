const express = require('express');
const mongoose = require('mongoose');
const bluebird = require('bluebird');
const bodyParser = require('body-parser');
var expressHbs = require('express-handlebars');
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

app.engine('.hbs', expressHbs({defaultLayout: 'layout', extname: '.hbs'}));
app.set('view engine', 'hbs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(session(sess));

function Cart (initItems) {
    this.items = initItems;

    this.totalQty = 0;
    this.totalPrice = 0;

    if (this.items) {
        for (var key in this.items) {
            this.totalQty += this.items[key].qty;
            this.totalPrice += this.items[key].qty * this.items[key].item.price;
        }
    }

    this.add = function (item, id) {
        var storedItem = this.items[id];
        if (!storedItem) {
            storedItem = this.items[id] = {qty: 0, item: item, price: 0};
        }
        storedItem.qty++;
        storedItem.price = storedItem.item.price * storedItem.qty;
        this.totalQty++;
        this.totalPrice += storedItem.price;
    };

    this.generateArray = function () {
        var arr = [];
        for (var id in this.items) {
            arr.push(this.items[id]);
        }
        return arr;
    };
}


const Product = mongoose.model('Product', {
    imagePath: String,
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

app.get('/', function (req, res, next) {
    Product.find(function (err, docs) {
        var productChunks = [];
        var chunkSize = 3;
        for (var i = 0; i < docs.length; i += chunkSize) {
            productChunks.push(docs.slice(i, i + chunkSize));
        }
        return res.render('shop/index', {title: 'Shopping Cart', products: productChunks});
    });
});


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


app.get('/generate_products', auth, function(req, res) {
    res.render('generate.hbs')
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
            // res.json({
            //     username: username,
            //     token: token
            // });
            res.redirect('/');
        });
    });
});

app.post('/add_game', function(req, res) {
    var p = new Product({
        imagePath: req.body.imagePath,
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

// app.get('/api/product/:id', function(req, res) {
//     var id = req.params.id;
//     Product.findById(id)
//         .then(function(docs) {
//             console.log(docs);
//         });
// });

// app.post('/api/add_to_cart', auth, function(req, res){
//     var id = req.params.id;
//     Product.findById(id)
//     .then(function(docs){
//         console.log(docs);
//     });
//     session.cart.push(id);
// });

app.get('/api/add-to-cart/:id', auth, function (req, res, next) {
    var productId = req.params.id;
    var cart = new Cart(req.session.cart ? req.session.cart.items : {});

    Product.findById(productId, function (err, product) {
        cart.add(product, product.id);
        req.session.cart = cart;
        res.redirect('/');
    });
});

app.get('/shopping-cart', auth, function (req, res, next) {
    if (!req.session.cart) {
        return res.render('shop/shopping-cart', {products: null});
    }
    var cart = new Cart(req.session.cart.items);
    res.render('shop/shopping-cart', {products: cart.generateArray(), totalPrice: cart.totalPrice});
});

// app.post('/api/shopping_cart', auth, function(req, res) {
//     console.log(session.cart);
// });

app.post('/api/shopping_cart/checkout', auth, function(req, res){

});


// app.get('')

app.listen(3000, function() {
    console.log('3000!');
});
