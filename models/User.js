const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');
const validator = require('validator');

const emailValidate = [{
    validator: validator.isEmail,
    message: "Email isn't Valid",
    isAsync: false
},
{
    validator: (v) => validator.isByteLength(v, { max: 100 }),
    message: "Email can't be more than 100 characters",
    isAsync: false
}];

const passwordValidate = [{
    validator: (v) => validator.isByteLength(v, { min: 6 }),
    message: "Password must be at least 6 characters",
    isAsync: false
},
{
    validator: (v) => validator.isByteLength(v, { max: 200 }),
    message: "Password can't be more than 200 characters",
    isAsync: false
},
{
    validator: (v) => validator.matches(v, /\d/ig),
    message: "Password should have 1 number",
    isAsync: false
}];

const nameValidate = [{
    validator: function (v) {
        return this.tutor ? validator.isByteLength(v, { max: 20 }) : true;
    },
    message: "Name can't be more than 20 characters",
    isAsync: false
}, {
    validator: function (v) {
        return validator.isByteLength(v, { min: 3 });
    },
    message: "Name can't be less than 3 characters",
    isAsync: false
}, {
    validator: function (v) {
        return validator.isAlphanumeric;
    },
    message: "Name can't contain symbols and spaces",
    isAsync: false
}];

const UserSchema = new mongoose.Schema({
    email: { type: String, unique: true, validate: emailValidate, required: true, lowercase: true, trim: true },
    firstName: { type: String, validate: nameValidate, required: true, trim: true },
    lastName: { type: String, validate: nameValidate, required: true, trim: true },
    tutor: { type: Boolean, default: false },
}, { discriminatorKey: 'kind', timestamps: true });


//
UserSchema.plugin(passportLocalMongoose, {
    maxAttempts: 8,
    usernameField: 'email',
    passwordValidator: function (value, cb) {
        let msg = null;
        passwordValidate.some(function (obj) {
            if (!obj.validator(value)) {
                msg = obj.message;
                return true;
            }
        });
        if (msg) cb({ message: msg });
        cb();
    }
});



module.exports = mongoose.model('User', UserSchema);

