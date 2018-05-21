var User = require("../models/User");

const Profile = {};

Profile.index = function(req, res) {
    res.locals.user = req.user;
    res.render('myprofile');
    // res.render('myprofile', {user: req});
};




module.exports = Profile;
