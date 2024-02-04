
//jshint esversion:6
require('dotenv').config()
const dotenv=require('dotenv');
const express=require("express");
const bodyParser=require("body-parser");
const ejs=require("ejs");
const mongoose=require("mongoose");
const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
var GoogleStrategy = require('passport-google-oauth20').Strategy;
var findOrCreate=require("mongoose-findorcreate");


console.log(process.env.API_KEY);
mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser:true});
//mongoose.set("useCreateIndex",true);
const app=express();
app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));
app.use(session({
    secret:"Our little secret.",
    resave:false, 
    saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());

const userSchema = new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
    secret:String
    // whatever else
});


    userSchema.plugin(passportLocalMongoose);
    userSchema.plugin(findOrCreate);



const User=new mongoose.model("User",userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user,done){
    done(null,user.id);
});
passport.deserializeUser(function (id, done) {
    User.findById(id)
        .then(user => {
            done(null, user);
        })
        .catch(err => {
            done(err);
        });
});
passport.use(new GoogleStrategy({
    clientID:process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    //userProfileURL:"https://googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",function(req,res){
    res.render("home");
});


app.get("/login",function(req,res){
    res.render("login");
});

app.get("/register",function(req,res){
    res.render("register");
});
app.get("/secrets",function(req,res){
    User.find({"secret": {$ne: null}})
    .then(function(foundUsers) {
        res.render("secrets", {userWithSecrets: foundUsers});
    })
    .catch(function(err) {
        console.log(err);
        // Handle the error appropriately
    });
   });


app.get("/submit",function(req,res){
    if(req.isAuthenticated()){
        res.render("submit");
    }
    else{
        res.redirect("/login");
    }

});
app.post("/submit",function(req,res){
    const secret = req.body.secret;
    User.findById(req.user.id)
    .then(function(foundUser) {
        if (foundUser) {
            foundUser.secret = secret;
            return foundUser.save();
        } else {
            console.log("Error in saving the user!");
            return Promise.reject("User not found");
        }
    })
    .then(function(savedUser) {
        res.redirect("/secrets");
    })
    .catch(function(error) {
        console.error(error);
        // Handle the error appropriately
    });

    });

    

app.get("/logout", (req, res) => {
    req.logout(req.user, err => {
      if(err) return next(err);
      res.redirect("/");
    });
  });

  app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));
  app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });


app.post("/register",function(req,res){
    
        User.register({username:req.body.username},req.body.password,function(err,user){
            if(err)
            {
                console.log(err);
                res.redirect("/register");
            }
            else{
                passport.authenticate("local")(req,res,function(){
                    res.redirect("/secrets");
                });
            }
        });
    });
    

    app.post("/login",function(req,res){
        
        const user=new User({
            username:req.body.username,
            password:req.body.password
        });
        req.login(user,function(err){
            if(err){
              console.log(err);
            }
            else{
                passport.authenticate("local")(req,res,function(){
                    res.redirect("/secrets");
                    });
            }
        });
    });
 

app.listen(3000, function() {
    console.log("Server started on port 3000");
  });
