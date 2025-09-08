const express = require("express")
const mongoose = require("mongoose")
const path =  require("path")
const session = require("express-session")
const bcrypt = require("bcryptjs")
const nodemailer = require("nodemailer")
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

mongoose.connect(process.env.MONOGO_URL,{
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(()=>{
  console.log("mongodb connected")
}).catch(error=> console.log(error))

app.get("/", (req,res)=>{
  res.sendFile(path.join(__dirname,"views", "login.html"))
})
app.get("/register", (req,res)=>{
  res.sendFile(path.join(__dirname,"views", "register.html"))
})
app.get("/home", (req,res)=>{
  // if(req.session.user){
     res.sendFile(path.join(__dirname,"views", "home.html"))
  // }else{
  //   res.send(`
  //     <script>
  //       alert("plz login");
  //       window.location.href="/";
  //     </script>
  //     `)
  // }

})

 let tarnsporter = nodemailer.createTransport({
      service:"gmail",
      auth:{
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls:{
          rejectUnauthorized:false,
      }
    });

let otpstore = {}

app.post("/register", async(req,res)=>{
  const{name, email, password} = req.body;
  const otp = Math.floor(100000 + Math.random()*900000)  // 6 digit otp
  otpstore[email] = {otp, name, password}

  await tarnsporter.sendMail({
    from:process.env.EMAIL_USER,
    to:email,
    subject:"Verify your email",
    text:`Your otp is ${otp}`
  })

  req.session.tempEmail=email;
 res.send(`
      <script>
        alert("otp send to your mail id Verify it");
        window.location.href="/verify-otp";
      </script>
      `)
})

app.get("/verify-otp", (req, res)=>{
  res.sendFile(path.join(__dirname, "views", "verify.html"))
})

app.post("/verify-otp", async(req, res)=>{
  const {otp} = req.body
  const email =  req.session.tempEmail

  if(otpstore[email] && otpstore[email].otp == otp){
    const {name, password} = otpstore[email]
    const hashedpassword = await bcrypt.hash(password, 10);
    await new User ({name, email, password:hashedpassword}).save()
    delete otpstore[email]
    req.session.tempEmail=null;
     res.send(`
      <script>
        alert("otp verifyed login ");
        window.location.href="/";
      </script>
      `)
  }else{
     res.send(`
      <script>
        alert("otp invalid");
        window.location.href="/verify-otp";
      </script>
      `)
  }
})
app.get("/forgot-password", (req, res) =>{
  res.sendFile(path.join(__dirname, "views", "forgot-mail.html"))
})

app.post("/forgot-password", async(req,res)=>{
  const{email} = req.body
  const user = await User.findOne({email})
  if(!user){
    return res.send(`
      <script>
        alert("User not fount");
      </script>
      `)
  }
  const otp = Math.floor(100000 + Math.random()*900000)
  otpstore[email] = {otp}
  req.session.tempEmail=email;
  await tarnsporter.sendMail({
    from:process.env.EMAIL_USER,
    to:email,
    subject:"Password reset otp",
    text:`Your otp is ${otp}`
  })
  res.send(`
      <script>
        alert("OTP send yo your mail Verify it");
         window.location.href="/verify-forgot";
      </script>
      `)
})

app.get("/verify-forgot", (req, res)=>{
  res.sendFile(path.join(__dirname,"views", "forgot.html"))
})

app.post("/verify-forgot", async(req, res)=>{
  const {otp} = req.body
  const email = req.session.tempEmail
  if(otpstore[email] && otpstore[email].otp == otp){
    res.send(`
      <script>
        alert("OTP Verify reset your password");
         window.location.href="/reset-password";
      </script>
      `)
  }else{
    res.send(`
      <script>
        alert("OTP invaild");
      </script>
      `)
  }
})

app.get("/reset-password" ,(req, res)=>{
  res.sendFile(path.join(__dirname, "views", "reset.html"))
})

app.post("/reset-password", async(req, res)=>{
  const {password} = req.body
  const email = req.session.tempEmail
  const hashedpassword = await bcrypt.hash(password, 10)
  await User.updateOne({email}, {password: hashedpassword})
  delete otpstore[email];
  req.session.tempEmail =null;
  res.send(`
      <script>
        alert("Reset password successful login now ");
         window.location.href="/";
      </script>
      `)
})

app.post("/", async(req,res)=>{
  const {email, password} = req.body
  const user = await User.findOne({email})
  if(!user){
    return res.send(`
      <script>
        alert("User not Found ");
        window.location.href="/";
      </script>
      `)
  }
  const match = await bcrypt.compare(password, user.password)
  if(!match){
    return res.send(`
      <script>
        alert("in correct paswword ");
        window.location.href="/home";
      </script>
      `)
  }
  // req.session.user=user
  res.send(`
      <script>
        alert("Login successfull");
        window.location.href="/home";
      </script>
      `)
})

app.get("/logout", (req, res)=>{
  req.session.destroy()
  res.redirect("/")
})

app.listen(3000, ()=> console.log("server running on http://localhost:3000"))