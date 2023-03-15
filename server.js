//importing express module
const express = require("express");
const app = express();
const port = 4000;

const bcrypt = require('bcryptjs');

const mysql = require('mysql');
const session = require('express-session');
const bodyparser = require("body-parser")
app.use(bodyparser.urlencoded({ extended: true }))
app.use(bodyparser.json());

// Connect to the MySQL database
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'education'
});

connection.connect(function (error) {
  if (error) {
    throw error;
  }
  console.log('Successfully connected to the Database');
})

// Middleware to parse request body
app.use(express.urlencoded({ extended: true }));

// Middleware to enable sessions
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false
}));


// Route handler for home page
app.get('/', (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// teacher register page
app.get('/teacher/register', (req, res) => {
  res.sendFile(__dirname + "/teacherReg.html");
});

//Route handler for teacher registeration 
app.post('/teacher/register', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const role = 'teacher'
  const saltRounds = 10;
  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      console.error(err);
      res.status(500).send('Internal server error');
    } else {
      // Insert user into database
  let query = `select username,role from users where username = '${username}' and role = '${role}'`;
  connection.query(query, (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).send(error.toString());
    }
    else if (results.length === 1) {
      res.status(200).send(`User name already exists in ${role}`);
    }
    else {
      query = "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)";
      const values = [username, hash, role];
      connection.query(query, values, (error, results) => {
        if (error) {
          console.error(error);
          res.status(500).send(error.toString());
        } else {
          console.log(results);
          res.redirect('/');
        }
      });
    }
  });
}
});
})

// Route handler for teacher login 
app.post('/teacher/login', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  // const query = `SELECT * FROM users WHERE username = '${username}' AND password_hash = '${password}' and role = 'teacher'`;
  // connection.query(query, function (error, results) {
  //   if (error) throw error;
  //   if (results.length === 1) {
  //     // Passwords match User is authenticated
  //     res.redirect('/teacher');
  //   } else {
  //     // Passwords don't match or user not found
  //     res.status(401).send('Invalid username or password');
  //   }
  // });


  connection.query('SELECT * FROM users WHERE username = ?', [username], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).send('Internal server error');
    } else if (results.length === 0) {
      res.send('User does not exist');
    } else {
      // Compare password with bcrypt
      bcrypt.compare(password, results[0].password_hash, (err, result) => {
        if (err) {
          console.error(err);
          res.status(500).send('Internal server error');
        } else if (result === false) {
          res.send('Password is incorrect');
        } else {
          res.redirect('/teacher');
        }
      });
    }
  });
});




// Route to view all student records details
app.get('/teacher', (req, res) => {
  // Query the database for all students
  connection.query('SELECT * FROM student', (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).send('Internal server error');
    } else {
      // Display the list of students

      let html =
        `<table cellspacing="3" bgcolor="#000000">
          <tr bgcolor="#ffffff">
          <th>Name</th>
          <th>classTeacher</th>
          <th>english</th>
          <th>telugu</th>
          <th>maths</th>
          </tr>`
      for (let result of results) {
        html += `<tr bgcolor="#ffffff"><td>${result.name}</td>`;
        html += `<td>${result.classTeacher}</td>`;
        html += `<td>${result.engMarks}</td>`;
        html += `<td>${result.telMarks}</td>`;
        html += `<td>${result.mathMarks}</td>`;
        html += `</tr><br>`;
      }
      html += `</table><br>`
      html += `<li><a href="/teacher/logout">Log out</a></li>`;
      html += `<li><a href="/student/register">student register</a></li>`;
      html += `<li><a href="/teacher/addStudent">Add Student Details</a></li>`;

      res.send(html);
    }
  });
});

app.get('/teacher/addStudent', (req, res) => {
  res.sendFile(__dirname + "/studentDetails.html");
});

// router to add new student details
app.post('/teacher/addStudent', (req, res) => {
  console.log(req.body)
  let { name, classTeacher, english, telugu, maths } = req.body;
  // Query the database for all students
  connection.query(`SELECT * FROM student where name = '${name}'`, (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).send('Internal server error');
    }
    else if (results.length === 1) {
      // user name exists
      res.status(200).send('User name already exists');
    } else {
      let query = `SELECT id FROM users where username = '${name}'`
      connection.query(query, (error, results) => {
        console.log(results, query)
        if (!error && results.length > 0) {
          console.log(results)
          connection.query(`INSERT INTO student (user_id,name,classTeacher,engMarks, telMarks, mathMarks)
          VALUES (?, ?,?, ?,?,?)`, [results[0].id, name, classTeacher, english, telugu, maths], (error, results) => {
            if (!error) {
              res.status(200).send('Student details added successfully!');
            }
            else {
              res.status(500).send(error.toString)
            }
          })
        }
        else {
          res.status(404).send('User not found , please register');

        }
      });
    }
  });
});

app.get('/teacher/updtStudent', (req, res) => {
  res.sendFile(__dirname + "/studentDetails.html");
});

// router to update existing  student details

app.post('/teacher/updtStudent', (req, res) => {
  let { name, classTeacher, english, telugu, maths } = req.body;
  // Query the database for all students
  connection.query(`SELECT user_id FROM student where name = '${name}'`, (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).send('Internal server error');
    }
    else if (results.length === 0) {
      // user name exists
      res.status(404).send('User not found');
    } else {
      console.log(results[0].user_id)
      let query = `update student set  engMarks = ${english},
      telMarks= ${telugu}, mathMarks = ${maths}, classteacher= '${classTeacher}' where user_id  = ${results[0].user_id}`
      console.log(query)
      connection.query(query, (error, results) => {
        if (!error) {
          res.status(200).send('Student details updated successfully!');
        }
        else {
          res.status(500).send(error.toString)
        }
      });
    }
  });
});

app.get('/teacher/delStudent', (req, res) => {
  res.sendFile(__dirname + "/studentDetails.html");
});

// router to delete existing  student details

app.post('/teacher/delStudent', (req, res) => {
  let { name } = req.body;
  // Query the database for all students
  connection.query(`SELECT user_id FROM student where name = '${name}'`, (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).send('Internal server error');
    }
    else if (results.length === 0) {
      // user name exists
      res.status(404).send('User not found');
    } else {
      let query = `delete from student where user_id = ${results[0].user_id}`
      connection.query(query, (error, results) => {
        if (error) {
          res.status(500).send(error.toString)
        }
      });
      let query1 = `delete from users where id = ${results[0].user_id}`
      connection.query(query1, (error, results) => {
        if (!error) {
          res.status(200).send('Student Deleted successfully!');
        }
        else {
          res.status(500).send(error.toString)
        }
      });
    }
  });
});

app.get('/student/register', (req, res) => {
  res.sendFile(__dirname + "/studentReg.html");
});

// router to register student 

app.post('/student/register', (req, res) => {
  console.log(req.body);
  const username = req.body.username;
  const password = req.body.password;
  const role = 'student'
  let query = `select username from users where username = '${username}'`
  connection.query(query, function (error, results) {
    if (error) {
      console.error(error);
      res.status(500).send(error.toString());
    }
    else if (results.length === 1) {
      res.status(200).send('User name already exists');
    }
    else {
      query = "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)";
      connection.query(query, [username, password, role], (error, results) => {
        if (error) {
          console.error(error);
          res.status(500).send('Internal server error');
        } else {
          console.log(results);
          // res.send('Successfully registered student');
          res.redirect('/teacher');
        }
      });

    }

  });
});

// Route handler for teacher login submission
app.post('/student/login', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const query = `SELECT * FROM users WHERE username = '${username}' AND password_hash = '${password}' and role = 'student'`;
  connection.query(query, function (error, results) {
    if (error) throw error;
    if (results.length === 1) {
      // Passwords match User is authenticated
      res.redirect(`/student?name=${username}`);
    } else {
      // Passwords don't match or user not found
      res.status(401).send('Invalid username or password');
    }
  });

  app.get('/student', (req, res) => {
    // Query the database for all students
    let userName = req.query.name
    let html = `Welcome ${userName} <br>`;
    connection.query(`SELECT * FROM student where name ='${userName}'`, (error, results) => {
      if (error) {
        console.error(error);
        res.status(500).send('Internal server error');
      } else if(results.length !=0) {
        // Display the list of students
         html +=
        `<table cellspacing="3" bgcolor="#000000">
          <tr bgcolor="#ffffff">
          <th>Name</th>
          <th>classTeacher</th>
          <th>english</th>
          <th>telugu</th>
          <th>maths</th>
          </tr>`
      for (let result of results) {
        html += `<tr bgcolor="#ffffff"><td>${result.name}</td>`;
        html += `<td>${result.classTeacher}</td>`;
        html += `<td>${result.engMarks}</td>`;
        html += `<td>${result.telMarks}</td>`;
        html += `<td>${result.mathMarks}</td>`;
        html += `</tr><br>`;
      }
      html += `</table><br>`
        html += '</ul>';
        html += `<li><a href="/student/logout">Log out</a></li>`;
      }
      else{
         html += `<h1>Students details need to be added !!</h1>`
      }
      res.send(html);
    });
  });

  // router to get student details
  app.post('/student/getDetails', (req, res) => {
    console.log(req.body);
    const username = req.body.username;
    const password = req.body.password;
    const role = 'student'
    let query = `select username from users where username = '${username}'`
    connection.query(query, function (error, results) {
      if (error) {
        console.error(error);
        res.status(500).send(error.toString());
      }
      else if (results.length === 1) {
        res.status(200).send('User name already exists');
      }
      else {
        query = "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)";
        connection.query(query, [username, password, role], (error, results) => {
          if (error) {
            console.error(error);
            res.status(500).send('Internal server error');
          } else {
            console.log(results);
            res.redirect('/teacher');
          }
        });

      }

    });
  });

  // // Query the database for the teacher with the given username
  // connection.query('SELECT * FROM users WHERE username = ?', [username], (error, results) => {
  //   if (error) {
  //     console.error(error);
  //     res.status(500).send('Internal server error');
  //   } else if (results.length == 0) {
  //     res.status(401).send('Invalid username or password');
  //   } else {
  //     // Compare the hashed password with the input password  //bcrypt.
  //     bcrypt.compare(password, results[0].password, (error, result) => {
  //       if (error) {
  //         console.error(error);
  //         res.status(500).send('Internal server error');
  //       } else if (!result) {
  //         res.status(401).send('Invalid username or password');
  //       } else {
  //         // Set the session user to the teacher's ID
  //         req.session.user = results[0].id;
  //         res.redirect('/teacher');
  //       }
  //     });
  //   }
  // });
});

// Route handler for teacher logout
app.get('/teacher/logout', (req, res) => {
  // Destroy the session and redirect to home page
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.get('/student/logout', (req, res) => {
  // Destroy the session and redirect to home page
  req.session.destroy(() => {
    res.redirect('/');
  });
});


//connecting to server
app.listen(port, function () {
  console.log(`Server is running on ${port}`)
})