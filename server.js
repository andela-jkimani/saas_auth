var express = require('express');

var app = express();
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var passport = require('passport');
var jwt = require('jsonwebtoken');

var config = require('./config/main');
var User = require('./app/models/user');

// Configuration
var port = process.env.PORT || 3000; // Configure the port
mongoose.connect(config.database); // Connect to db
app.set('superSecret', config.secret); // Secret variable

// Use body-parser to get POST requests for API use
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// To log requests to the console
app.use(morgan('dev'));

app.get('/', function(req, res) {
  res.send('Hello, API is at http://localhost:' + port + '/api');
});

app.get('/setup', function(req, res) {
  // Creating a sample user
  var jacky = new User({
    name: 'jacky',
    password: 'jacky'
  });

  // Saving the user
  jacky.save(function(err) {
    if (err) throw err;
    console.log('User saved successfully!');
    res.json({ success: true });
  });
});

// initialize passport for use
app.use(passport.initialize());

// bring in the passport stategy
require('./config/passport')(passport);

// create API group routes
var router = express.Router();


// register new users
router.post('/register', function(req, res) {
  if (!req.body.email || !req.body.password) {
    res.json({ success: false, message: 'Please enter your email and password to register!' });
  } else {
    var newUser = new User({
      email: req.body.email,
      password: req.body.password,
    });
    // save new user
    newUser.save(function(err) {
      if (err) {
        res.json({ success: false, message: 'Email address already exists' });
      } else {
        res.json({ success: true, message: 'Successfully created new user' });
      }
    });
  }
});

// authenticate user
router.post('/authenticate', function(req, res) {
  User.findOne({
    email: req.body.email,
  }, function(err, user) {
    if (err) throw err;
    if (!user) {
      res.send({ success: false, message: 'Authentication failed. User not found' });
    } else {
      // check if password matches
      user.comparePassword(req.body.password, function(isMatch) {
        if (isMatch && !err) {
          // create token
          var token = jwt.sign(user, config.secret, {
            expiresIn: 10080, // a week in seconds
          });
          res.json({ success: true, token: 'JWT ' + token });
        } else {
          res.json({ success: false, message: 'Authentication failed. Wrong password' });
        }
      });
    }
  });
});

// Protect dashboard route with JWT
app.get('/dashboard', passport.authenticate('jwt', { session: false }), function(req, res) {
  res.send('It worked! User id is: ' + req.user._id + '.');
});

// Set URL for API group routes
app.use('/api', router);

// home route
app.get('/', function(req, res) {
  res.send('This is the home page');
});

app.listen(port);
console.log('You are running on port ' + port);
