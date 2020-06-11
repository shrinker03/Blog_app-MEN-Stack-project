var mongoose = require("mongoose");

//Blog Schema//
var blogSchema = new mongoose.Schema({
    title: String,
    image: String,
    body: String,
    author:{
        id:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    },
    comments: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment"
        }],
    createdAt: {type: Date, default: Date.now}
});

module.exports = mongoose.model("Blog", blogSchema);