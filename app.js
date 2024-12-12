require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const XLSX = require('xlsx');
const multer = require('multer');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const flash = require('connect-flash');
const { MongoClient, ObjectId } = require('mongodb');
const { spawn } = require('child_process');

const app = express();

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware for serving static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));

// Body parser middleware to parse form data
app.use(bodyParser.urlencoded({ extended: true }));

// Flash message setup
app.use(flash());

// Session setup for authentication
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

// Passport.js initialization
app.use(passport.initialize());
app.use(passport.session());

// MongoDB setup
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function connectToMongo() {
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    app.locals.User = db.collection('users');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

connectToMongo();

// Passport local strategy for login
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const usersCollection = app.locals.User;
      const user = await usersCollection.findOne({ username });
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);



passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback",
    },
    async function (accessToken, refreshToken, profile, cb) {
      try {
        const usersCollection = app.locals.User;
        // Search for existing user by Google ID
        const existingUser = await usersCollection.findOne({ googleId: profile.id });

        if (existingUser) {
          // If user exists, return the user
          return cb(null, existingUser);
        }

        // Extract email from profile
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        if (!email) {
          // If no email found, return error message
          return cb(null, false, { message: 'Google account does not have an email address.' });
        }

        // If no existing user, create new one
        const newUser = {
          googleId: profile.id,
          fullname: profile.displayName,
          email: email,
        };

        // Insert the new user into the database
        const result = await usersCollection.insertOne(newUser);
        
        // If the insert operation was successful, use the inserted ID to form the user object
        if (result.insertedId) {
          const user = { ...newUser, _id: result.insertedId }; // Add the insertedId to the newUser
          return cb(null, user);  // Pass the new user to Passport
        } else {
          return cb(null, false, { message: 'Failed to create a new user.' });
        }
      } catch (err) {
        return cb(null, err);  // Propagate any error to Passport
      }
    }
  )
);




// Serialize user
passport.serializeUser((user, done) => {
  done(null, user._id.toString());
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    const usersCollection = app.locals.User;
    const user = await usersCollection.findOne({ _id: new ObjectId(id) });
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Middleware to pass flash messages to all views
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// Middleware to check if the user is authenticated and prevent access to login/signup
function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    req.flash('error', 'You are already logged in.');
    return res.redirect('/excelfileuploadation');
  }
  next();
}

// Middleware to ensure pages are only accessed by authenticated users
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'You must be logged in to view this page.');
  res.redirect('/login');
}

// Home page route (accessible to everyone)
app.get('/', (req, res) => {
  res.render('index', { user: req.user });
});

// Login GET route (with check for authentication)
app.get('/login', checkAuthenticated, (req, res) => {
  res.render('login', {
    error: req.flash('error'),
    success: req.flash('success')
  });
});

// Sign-up GET route (with check for authentication)
app.get('/signup', checkAuthenticated, (req, res) => {
  res.render('sign-up', {
    error: req.flash('error'),
    success: req.flash('success')
  });
});

// POST route for sign-up
app.post('/signup', async (req, res) => {
  const { fullname, username, password, confirmPassword } = req.body;
  if (password != confirmPassword) {
    req.flash('error', 'Passwords do not match.');
    return res.redirect('/signup');
  }

  const usersCollection = app.locals.User;
  const existingUser = await usersCollection.findOne({ username: username });
  if (existingUser) {
    req.flash('error', 'User already exists.');
    return res.redirect('/signup');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    fullname,
    username: username, // Username used for login
    password: hashedPassword,
  };

  await usersCollection.insertOne(newUser);
  req.flash('success', 'Sign-up successful! Please log in.');
  res.redirect('/login');
});

// POST route for login
app.post(
  '/login',
  passport.authenticate('local', {
    successRedirect: '/excelfileuploadation',
    failureRedirect: '/login',
    failureFlash: true,
  })
);



// Google authentication route
app.get('/auth/google', 
  passport.authenticate('google', {
    scope: ['profile', 'email'], // Request profile and email scopes
    accessType: 'offline',        // Request offline access (refresh token)
  })
);

// Google callback route
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login' }),  // Redirect to login route on failure
  function(req, res) {
    // Successful authentication, redirect to /excelfileuploadation
    res.redirect('/excelfileuploadation');
  }
);



// Logout route
app.get('/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});

// Route to display the file upload page (only accessible to authenticated users)
app.get('/excelfileuploadation', ensureAuthenticated, (req, res) => {
  res.render('uploadFile');
});

// Set up Multer for file uploads (in memory for processing)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


// File upload route
app.post('/upload-file', ensureAuthenticated, upload.single('excelFile'), async (req, res) => {
  try {
    // Access the User collection and uploaded file
    const usersCollection = app.locals.User;
    const file = req.file;

    if (!file) {
      return res.status(400).send('No file uploaded.');
    }

    // Parse the uploaded Excel file
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

    // Locate the header row
    const headersRowIndex = jsonData.findIndex(row =>
      Array.isArray(row) && row.includes('Date') && row.includes('Narration')
    );

    if (headersRowIndex === -1) {
      return res.status(400).send('Invalid file format. Could not find transaction details.');
    }

    // Process transaction rows and eliminate footer
    const transactionRows = jsonData.slice(headersRowIndex + 1).filter(row => {
      const isEmptyRow = row.every(cell => cell === undefined || cell === null || cell === '');
      return !isEmptyRow; // Exclude empty footer rows
    });

    const newTransactions = transactionRows.map(row => {
      // Format the date as DD/MM/YYYY
      let dateStr = row[0];
      dateStr = String(dateStr).replace(/-/g, '/');

      const narration = row[1];
      const refNo = row[2];
      const withdrawalAmount = parseFloat(row[4]);

      return {
        date: dateStr,
        narration,
        refNo,
        withdrawalAmount,
      };
    }).filter(tx => !isNaN(tx.withdrawalAmount));

    console.log(`Number of entries extracted from Excel: ${newTransactions.length}`);

    // Find the user in the database
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user._id) });

    if (!user) {
      return res.status(404).send('User not found.');
    }

    // Combine old and new transactions
    const combinedTransactions = user.transactions ? user.transactions.concat(newTransactions) : newTransactions;

    // Calculate monthly expenditures
    const monthlyExpenditures = {};

    combinedTransactions.forEach(tx => {
      const [day, month, year] = tx.date.split('/').map(Number);
      const yearMonthKey = `${year}-${String(month).padStart(2, '0')}`;

      if (!monthlyExpenditures[yearMonthKey]) {
        monthlyExpenditures[yearMonthKey] = {
          Year: year,
          Month: month,
          Monthly_Expenditure: 0,
          MonthYear: `${String(month).padStart(2, '0')}/${year}` // Properly formatted month/year string
        };
      }

      monthlyExpenditures[yearMonthKey].Monthly_Expenditure += tx.withdrawalAmount;
    });

    // Convert monthly expenditures to a sorted array
    const processedData = Object.values(monthlyExpenditures).sort((a, b) =>
      a.Year - b.Year || a.Month - b.Month
    );

    // Update the user's document in the database
    await usersCollection.updateOne(
      { _id: new ObjectId(req.user._id) },
      {
        $set: {
          transactions: combinedTransactions,
          processedData: processedData,
        },
      }
    );

    console.log(`Total transactions stored in database after update: ${combinedTransactions.length}`);
    console.log('Processed monthly expenditures data saved to database.');

    res.redirect('/visualize-data');
  } catch (error) {
    console.error('Error processing the file:', error);
    res.status(500).send('Error processing the file.');
  }
});


app.get('/visualize-data', ensureAuthenticated, async (req, res) => {
  const usersCollection = app.locals.User;

  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user._id) });

    if (!user || !user.processedData || !user.transactions) {
      return res.status(404).send('No data found for visualization.');
    }

    // Helper function to correctly convert YY to YYYY and handle both cases
    const convertYear = (year) => {
      year = year.toString(); // Ensure year is a string
      if (year.length === 2) {
        const numericYear = parseInt(year, 10);
        return numericYear < 50 ? `20${year}` : `19${year}`; // Assuming 50-year window
      } else if (year.length === 4) {
        return year; // Already in YYYY format
      }
      return year; // Return as-is if it doesn't meet conditions (e.g., invalid formats are ignored)
    };

    // Extract and normalize years from transaction data
    const years = Array.from(new Set(
      user.transactions.map(tx => {
        const year = tx.date.split('/')[2];
        return convertYear(year);
      })
    )).sort((a, b) => b - a);

    const labels = user.processedData.map(entry => {
      const normalizedYear = convertYear(entry.Year);
      return `${entry.Month}/${normalizedYear}`;
    });

    const values = user.processedData.map(entry => entry.Monthly_Expenditure);

    const tableHeaders = ['Date', 'Narration', 'Reference No', 'Withdrawal Amount'];
    const tableRows = user.transactions.map(tx => {
      
      const dateParts = tx.date.split('/');
      dateParts[2] = convertYear(dateParts[2]); // Normalize the year if needed
      const normalizedDate = dateParts.join('/');
      
      return [normalizedDate, tx.narration, tx.refNo, tx.withdrawalAmount];
    });

    res.render('visualizeData', {
      isPrediction: false, // Tracking data, so not a prediction
      years: years, // Pass unique years for dropdown
      chartData: {
        labels,
        values
      },
      tableData: {
        headers: tableHeaders,
        rows: tableRows
      }
    });
  } catch (error) {
    console.error('Error loading data for visualization:', error);
    res.status(500).send('Error loading data for visualization.');
  }
});



app.get('/predict-expenditure', ensureAuthenticated, async (req, res) => {
  const usersCollection = app.locals.User;

  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user._id) });

    if (!user || !user.processedData) {
      return res.status(404).send('Processed data not found for predictions.');
    }

    const pythonProcess = spawn('python', ['ML files/predict_model.py']);
    pythonProcess.stdin.write(JSON.stringify(user.processedData));
    pythonProcess.stdin.end();

    let responseSent = false;

    pythonProcess.stdout.on('data', (data) => {
      if (!responseSent) {
        const predictions = JSON.parse(data.toString());

        const labels = predictions.map(pred => pred.Month_Name);
        const values = predictions.map(pred => pred.Predicted_Monthly_Expenditure);

        const tableHeaders = ['Month Name', 'Predicted Monthly Expenditure'];
        const tableRows = predictions.map(pred => [pred.Month_Name, pred.Predicted_Monthly_Expenditure]);

        res.render('visualizeData', {
          isPrediction: true, // Flag for prediction visualization
          chartData: {
            labels,
            values
          },
          tableData: {
            headers: tableHeaders,
            rows: tableRows
          }
        });

        responseSent = true;
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python error: ${data}`);
      if (!responseSent) {
        res.status(500).send('Error processing predictions.');
        responseSent = true;
      }
    });

    pythonProcess.on('exit', (code) => {
      if (!responseSent && code !== 0) {
        res.status(500).send('Prediction process failed.');
      }
    });
  } catch (error) {
    console.error('Error retrieving data for predictions:', error);
    res.status(500).send('Error processing the predictions.');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
