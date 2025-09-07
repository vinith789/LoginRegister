const express = require("express")
const mongoose = require("mongoose")
const path =  require("path")
const session = require("express-session")
const bcrypt = require("bcryptjs")
const bodyParser = require("body-parser")
const User = require("./models/User")

require("dotenv").config()

const app = express()

app.use(session({
  secret:"secretkey",
  resave:false,
  saveUninitialized:true
}))
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname, "views")))

mongoose.connect(process.env.MONOGO_URL).then(()=>{
  console.log("mongodb connected")
}).catch(error=> console.log(error))

app.get("/login", (req,res)=>{
  res.sendFile(path.join(__dirname,"views", "login.html"))
})
app.get("/register", (req,res)=>{
  res.sendFile(path.join(__dirname,"views", "register.html"))
})
app.get("/home", (req,res)=>{
  if(req.session.user){
     res.sendFile(path.join(__dirname,"views", "home.html"))
  }else{
    res.send(`
      <script>
        alert("plz login");
        window.location.href="/login";
      </script>
      `)
  }

})

app.post("/register", async(req,res)=>{
  const{name, email, password} = req.body;
  const hashedpassword = await bcrypt.hash(password, 10) //
  const newuser = new User({name, email, password:hashedpassword})
  await newuser.save()
 res.send(`
      <script>
        alert("Register Successfully");
        window.location.href="/login";
      </script>
      `)
})

app.post("/login", async(req,res)=>{
  const {email, password} = req.body
  const user = await User.findOne({email})
  if(!user){
    return res.send(`
      <script>
        alert("User not Found ");
        window.location.href="/login";
      </script>
      `)
  }
  const match = await bcrypt.compare(password, user.password)
  if(!match){
    return res.send(`
      <script>
        alert("in correct paswword ");
        window.location.href="/login";
      </script>
      `)
  }
  req.session.user=user
  res.send(`
      <script>
        alert("Login successfull");
        window.location.href="/home";
      </script>
      `)
})

app.get("/logout", (req, res)=>{
  req.session.destroy()
  res.redirect("/login")
})

app.listen(3000, ()=> console.log("server running on http://localhost:3000"))