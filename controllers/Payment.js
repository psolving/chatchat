const stripe = require("stripe")("sk_test_YTmA0CQReuJyFJ3rKICm5NMo");


function charge(token, amount) {
    stripe.charges.create({
        amount: amount,
        currency: "usd",
        description: "Tutoring charge",
        source: token,
    }, function (err, charge) {
        console.log(err);
    });
}

module.exports = {
    charge
};