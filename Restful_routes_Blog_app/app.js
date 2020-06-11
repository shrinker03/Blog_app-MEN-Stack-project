var express = require("express");
var app = express();
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var methodOverride = require("method-override");
var expressSanitizer = require("express-sanitizer");
var User = require("./models/user");
var Blog = require("./models/blog");
var Comment = require("./models/comment");
var passport = require("passport");
var LocalStrategy = require("passport-local");
var passportLocalMongoose = require("passport-local-mongoose");
//Connecting DB// 
var url = process.env.DATABASEURL || "mongodb://localhost:27017/Blog_app";
mongoose.connect(url);

//USing variables//
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.use(expressSanitizer());
app.locals.moment = require('moment');
//Using Auth var//


app.use(require("express-session")({
    secret: "blah blah",
    resave: false,
    saveUninitialized: false})
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    next();
});



//==============//
    //Routes//
//==============//
app.get("/", function(req,res){
    res.redirect("/blogs");
});


app.get("/blogs", function(req,res){
    
    var noMatch = null;
    if(req.query.search){
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Blog.find({title: regex},function(err, blogs){
            if(err){
                console.log(err);
            }else{
                if(blogs.length < 1){
                    noMatch = "No blog found with the Name mentioned. Please try again!";
                }
                res.render("blogs/index",{blogs: blogs, noMatch: noMatch});
            }
        });
    }else{
        //Get all blogs from DB
        Blog.find({}, function(err,blogs){
            if(err){
                console.log(err);
            }else{
                res.render("blogs/index", {blogs:blogs, noMatch: noMatch});
            }
        });
    }
    
});


app.get("/blogs/new", isLoggedIn,function(req, res) {
    res.render("blogs/new"); 
});


app.post("/blogs", isLoggedIn,function(req,res){
    console.log(req.body);
    req.body.blog.body = req.sanitize(req.body.blog.body);
    console.log("===========");
    req.body.blog.author = {
        id: req.user._id,
        username: req.user.username
    };
    Blog.create(req.body.blog, function(err,blog){
        if(err){
            res.render(err);
        }else{
            res.redirect('/blogs/' + blog.id);
        }
    });
});


app.get("/blogs/:id", function(req, res){
    Blog.findById(req.params.id).populate("comments").exec(function(err, foundBlog){
        if(err){
            res.redirect("/blogs");
        }else{
            res.render("blogs/show", {blog: foundBlog});
        }
    });
    
});


app.get("/blogs/:id/edit", checkBlogAuthor,function(req,res){
    Blog.findById(req.params.id, function(err, foundBlog){
        if(err){
            console.log(err);
        }else{
            res.render("blogs/edit", {blog: foundBlog});
        }
            
    });
});


app.put("/blogs/:id", checkBlogAuthor,function(req,res){
    req.body.blog.body = req.sanitize(req.body.blog.body);
    Blog.findByIdAndUpdate(req.params.id, req.body.blog, function(err,blog){
        if(err){
            res.redirect("/blogs");
        }else{
            res.redirect("/blogs/" + req.params.id);
        }
    });
});


app.delete("/blogs/:id", checkBlogAuthor,function(req,res){
   Blog.findByIdAndRemove(req.params.id, function(err){
       if(err){
           res.redirect("/blogs");
       }else{
           res.redirect("/blogs");
       }
   });
});


//==========Comment Routes============//

app.get("/blogs/:id/comments/new", isLoggedIn, function(req, res) {
    Blog.findById(req.params.id, function(err, blog) {
        if(err){
            console.log(err);
        }else{
           res.render("comments/new", {blog: blog}); 
        }
    });
});

app.post("/blogs/:id/comments",isLoggedIn, function(req, res) {
    Blog.findById(req.params.id, function(err, blog){
        if(err){
            console.log(err);
            res.redirect("/blogs");
        }else{
            Comment.create(req.body.comment, function(err, comment){
                if(err){
                    console.log(err);
                }else{
                    comment.author.id = req.user._id;
                    comment.author.username = req.user.username;
                    comment.save();
                    blog.comments.push(comment);
                    blog.save();
                    res.redirect("/blogs/"+ blog._id);
                }
            });
        }
    });
});

app.get("/blogs/:id/comments/:comment_id/edit", checkCommentAuthor, function(req, res) {
    Comment.findById(req.params.comment_id, function(err, foundComment) {
        if(err){
            res.redirect("back");
        }else{
            res.render("comments/edit", {blog_id: req.params.id, comment: foundComment});
        }
    });
});


app.post("/blogs/:id/comments/:comment_id", checkCommentAuthor, function(req, res) {
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, updatedComment){
        if(err){
            res.redirect("back");
        }else{
            res.redirect("/blogs/" + req.params.id);
        }
    });
});


app.delete("/blogs/:id/comments/:comment_id", checkCommentAuthor, function(req, res){
    Comment.findByIdAndRemove(req.params.comment_id, function(err){
        if(err){
            res.redirect("back");
        }else{
            res.redirect("/blogs/" + req.params.id);
        }
    });
});

// =========User Routes============//

app.get("/users/:id", function(req, res) {
        User.findById(req.params.id, function(err, user) {
            if(err){
                console.log(err);
            }
            Blog.find().where("author.id").equals(user._id).exec(function(err, blogs){
                if(err){
                res.redirect("/");
            }
            res.render("user", {user: user, blogs: blogs});
        });
    });
});




//==========Auth Routes============//

app.get("/register", function(req, res) {
    res.render("register");
});

app.post("/register", function(req, res){
    var newUser = new User({username: req.body.username, firstName: req.body.firstName, lastName: req.body.lastName, userDesc: req.body.userDesc, avatar: req.body.avatar});
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            console.log(err);
            return res.render("register");
        }
        passport.authenticate("local")(req, res, function(){
            res.redirect("/blogs");
        });
    });
});

//=========Login auth=========//

app.get("/login", function(req, res) {
    res.render("login");
});

app.post("/login", passport.authenticate("local", {
        successRedirect: "/blogs",
        failureRedirect: "/login"
    }) ,function(req, res) {
});


//========Logout auth=========//
app.get("/logout", function(req, res) {
    req.logout();
    res.redirect("/");
});

//========Middleware==========//

function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect("/login");
}


function checkBlogAuthor(req, res, next){
    if(req.isAuthenticated()){
        Blog.findById(req.params.id, function(err, foundBlog) {
            if(err){
                res.redirect("back");
            }else{
                if(foundBlog.author.id.equals(req.user._id)){
                    next();
                }else{
                    res.redirect("back");
                }
            }
        });
    }else{
        res.redirect("back");
    }
}





function checkCommentAuthor(req, res, next){
    if(req.isAuthenticated()){
        Comment.findById(req.params.comment_id, function(err, foundComment) {
            if(err){
                res.redirect("back");
            }else{
                if(foundComment.author.id.equals(req.user._id)){
                    next();
                }else{
                    res.redirect("back");
                }
            }
        });
    }else{
        res.redirect("back");
    }
}

//============ Fuzzy - searching function ===========//
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}


//==================================//
app.listen(process.env.PORT,process.env.IP,function(){
    console.log("All set!");
});









