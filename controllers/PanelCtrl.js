var Tutor = require("../models/Tutor");
var User = require("../models/User");
var SUBJECTS = require("../models/_subjects");

var panelController = {};

// Go to setting page
panelController.settingIndex = function (req, res) {
    res.render('setting', { subjects: SUBJECTS });
},

    // Post settings
    panelController.settingPost = function (req, res) {
        const id = req.params.id;
        let form_data = req.body;
        let user_type = true ? Tutor : User;
        var conditions = { _id: id };

        // Updating Password missing
        // Missing validations
        var update = {
            firstName: form_data.firstName,
            lastName: form_data.lastName,
            email: form_data.email,
            subjects: form_data.subjects
        };

        // Add check for user type. 
        // Currently only Tutor will be able to change setting
        user_type.findOneAndUpdate(conditions, update, { upsert: true, new: true, runValidator: true }, function (err) {
            if (err) {
                console.log(err);
                return res.redirect("/setting");
            }
            //res.redirect('/setting');
        });

        user_type.findById(id).then(function(user_type){
            if (user_type){
                user_type.setPassword(form_data.password, function(){
                    user_type.save();
                    return res.redirect("/setting");
                });
            } else {
                res.status(500).json({message: 'This user does not exist'});
            }
        },function(err){
            console.error(err);
        });
    }

module.exports = panelController;