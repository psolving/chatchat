var mongoose = require("mongoose");
var passport = require("passport");
var User = require("../models/User");
var Tutor = require("../models/Tutor");
var SUBJECTS = require('../models/_subjects');

var userController = {};

// Go to registration page
userController.register = function (req, res) {
    res.render('register', { subjects: SUBJECTS });
};

// Post registration
userController.registerPost = function (req, res) {
    let form_data = req.body;
    let type_user = form_data.tutor ? Tutor : User;
    type_user.register(new type_user({...form_data}), form_data.password, function (err, user) {
        errors = [];
        if (err) {
            if (err.errors) {
                for (let e in err.errors) {
                    errors.push(err.errors[e].message);
                }
            } else if (err.name === 'MongoError' && err.code === 11000) {
                errors.push('User already exist!');
            } else if (err.message) {
                errors.push(err.message);
            } else {
                errors = ['Something went wrong!'];
            }

            return res.render('register', { user: form_data, err: errors, subjects: SUBJECTS });
        } else {
            req.login(user, function (err) {
                console.log('login Error: ', err);
                if (!err) {
                    res.redirect('/');
                } else {
                    res.redirect('/login');
                }
            });
        }

    });
};

// Go to login page
userController.login = function (req, res) {
    res.render('login');
};

// Post login
userController.loginPost = function (req, res, next) {
    if (!req.body.email || !req.body.password) {
        return res.render('login', { "err": "All fields required" });
    }
    passport.authenticate('local', function (err, user, info) {
        if (err) {
            return res.render('/login', { err: err });
        }

        // If a user is found
        if (user) {
            res.status(200);
            req.login(user, function (err) {
                if (!err) {
                    res.redirect('/');
                } else {
                    res.redirect('/login');
                }
            });
        } else {
            res.render('login', { err: "Username or Password were incorrect" });
        }
    })(req, res);


};

// logout
userController.logout = function (req, res) {
    req.logout();
    res.redirect('/');
};

module.exports = userController;