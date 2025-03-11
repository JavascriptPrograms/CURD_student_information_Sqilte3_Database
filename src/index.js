const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const flash = require('express-flash');
const session = require('express-session');


const db = new sqlite3.Database('./students.db',(err)=>{
    if(err){
        console.error('error opening database',err);
    }else{
        console.log('connected to the Sqlite3 database. ');
    }
});

db.run(`CREATE TABLE IF NOT EXISTS student(
        roll_number INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT,
        last_name TEXT,
        email TEXT,
        phone_number INTEGER,
        address TEXT,
        student_pic BLOB
        );`);

const app = express();

app.set('view engine','ejs');
app.use(express.static('public'));

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json())
app.use('/uploads',express.static(path.join('uploads')))
app.use(flash())

// Middleware to pass flash messages to views
// app.use((req, res, next) => {
//     res.locals.success_msg = req.flash('success_msg');
//     res.locals.error_msg = req.flash('error_msg');
//     next();
//   });

app.use(session({
    cookie:{maxAge:2000},
    secret:'secret',
    resave:false,
    saveUninitialized:true
}))


const storage = multer.diskStorage({
    destination: (req,file,cb)=>{
        cb(null,"uploads")
    },
    filename: (req,file,cb)=>{
        console.log(file);
        cb(null,Date.now()+ path.extname(file.originalname))
    }
})

const upload = multer({storage:storage})

app.get('/',(req,res)=>{
    res.render('index');
});
app.get('/home',(req,res)=>[
    res.render('pages/Home')
])
app.get('/add_student',(req,res)=>{
    res.render('pages/add_student')
});
app.get('/show_student',(req,res)=>{
    const page = parseInt(req.query.page) || 1 
    const pageSize = 3;
    const offset = (page - 1) * pageSize;
    const countQuery = 'SELECT COUNT(*) AS count FROM student';
    const sql = "SELECT * FROM student LIMIT ? OFFSET ?";

    db.get(countQuery,[],(err,result)=>{
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        const totalStudent = result.count;
        const totalPages = Math.ceil(totalStudent / pageSize);

        db.all(sql,[pageSize,offset],(err,student)=>{
            if(err){
                return res.status(500).json({ error: err.message });
            }
            res.render('pages/show_student', {
                student,
                currentPage: page,
                totalPages,
              });
        });
       
    });
});

app.post('/add_student',upload.single('image'),(req,res)=>{
    const roll_number = req.body.roll_number;
    const first_name = req.body.first_name;
    const last_name = req.body.last_name;
    const email = req.body.email;
    const phone_number = req.body.phone_number;
    const address = req.body.address;
    const student_pic = req.file.filename;

    // console.log(roll_number,"",first_name);
    const sql = "INSERT INTO student (roll_number,first_name,last_name,email,phone_number,address,student_pic) values(?,?,?,?,?,?,?)";
    const params = [roll_number,first_name,last_name,email,phone_number,address,student_pic];

    db.run(sql,params,function(err){
        if(err){
            res.status(400).json({error:err.message});
            return;
        }
        console.log("save the data in database");
        req.flash('success','Successfully Add in Database.!!')
        res.redirect('/add_student')
    });
});

app.get('/delete_student/:roll_number',(req,res)=>{
    const roll_number = req.params.roll_number;
    const sql = 'delete from student where roll_number=?';
    const params = [roll_number];

    db.run(sql,params,function(err){
        if(err){
            res.status(400).json({error:err.message});
            return;
        }
        // Check if any rows were affected (i.e., user was deleted)

        console.log("delete the data in database !!");
        res.redirect('/show_student')
    })
});

app.get('/edit_student/:roll_number',(req,res)=>{
    const roll_number = req.params.roll_number;
    const sql = 'SELECT * FROM student where roll_number=?';
    const params = [roll_number];

    db.get(sql,params,function(err,rows){
        if(err){
            res.status(400).json({error:err.message});
            return;
        }
        if(rows){
            res.render('pages/edit_student',{student:rows});
        }else{
            res.status(404).send('User not found');
        }
       
    })
});

app.post('/update_student/:roll_number',upload.single('image'),(req,res)=>{
    const roll_number = req.params.roll_number;
    const first_name = req.body.first_name;
    const last_name = req.body.last_name;
    const email = req.body.email;
    const phone_number = req.body.phone_number;
    const address = req.body.address;
    const student_pic = req.file.filename;

    const sql = 'UPDATE student SET first_name=?,last_name=?,email=?,phone_number=?,address=?,student_pic=? where roll_number=?';
    const params = [first_name,last_name,email,phone_number,address,student_pic,roll_number]
    db.run(sql,params,function(err,result){
        if(err){
            console.log(err.message);
        }else{
            console.log(result);
            console.log("update the data in database");
            req.flash('success','update the data in database !!')
            res.redirect('/show_student')
        }
    })
});

app.post('/search_student',(req,res)=>{
    const roll_number = req.body.roll_number;
    const sql = "select * from student where roll_number=?";
    const params = [roll_number];
    db.get(sql,params,(err,rows)=>{
        if(err){
            console.log(err.message);
        }
        if(rows){
            res.render('pages/search_student',{student:rows})
        }else{
            console.log("data not found");
        }
    })
});

const port = 3000;
app.listen(port,()=>{
    console.log(`Example app listening on port ${port}`)
});