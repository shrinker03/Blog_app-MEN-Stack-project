var mongoose = require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");



//User Schema//
var UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    firstName: String,
    lastName: String,
    avatar: String
});

UserSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("User", UserSchema);