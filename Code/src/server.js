const https = require('https')
const fs = require('fs');
const express = require("express");
const app = express();
const env = require('dotenv').config();
const axios = require('axios');
const request = require('request-promise');
const zlib = require('zlib');
const router = express.Router();
const {body, validationResult} = require('express-validator');
const exp = require('constants');
const bodyParser = require('body-parser');
const session = require('express-session');
//Sql server
const sql = require('mssql');
//Hashing algorithm
const bcrypt = require('bcrypt');


//HTTPS Certificates
const options = {
    key: fs.readFileSync(__dirname+'/Certificates/server.key'),
    cert: fs.readFileSync(__dirname+'/Certificates/server.crt')
}

//SERVER PORT
const PORT = process.env.PORT;

//Sql server config
const sqlConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        enableArithAbort: true,
        trustedConnection: true,
        trustedServerCertificate: true
    }
};

app.use(express.static(__dirname+'/Public')); //Serving static files
app.use(express.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 300000,     //5 Minutes in milliseconds
        httpOnly: true,     //cookie is not accessible via client side script
        secure: true,       // cookie will only be sent over HTTPS
        sameSite: 'strict'} // cookie will only be sent for requests with the same site
}));

//redirects back to main page when logged in and function called
function alreadyLoggedIn(req, res, next) {
    if (req.session.isLoggedIn) {
        res.send('<script>alert("Cannot access this page while logged in"); window.location.href="/"</script>');
    } else {
        next();
    }
}

//function that checks if user is logged in and allows them to go on this page
function allowLoggedIn(req, res, next) {
    if (req.session.isLoggedIn) {
        next();
    }
    else {
        res.send('<script>alert("You must be logged in to access this page"); window.location.href="/login"</script>');
    }
}

//GETTING THE MAIN PAGE
app.get('/', (req, res) => {
    fs.readFile(__dirname+'/Public/HTML/Main.html', 'utf8', (err, data) => {
    if (err) {
            console.log(err);
            console.log(__dirname);
            console.log(__dirname+"/HTML/Main.html");
            res.status(500).send('Internal Server Error');
        }
        
        // Get session data
        // If the user is logged in, isLoggedIn will be true, otherwise it will be false
        const isLoggedIn = req.session.isLoggedIn;
        const username = req.session.user ? req.session.user.username : '';

        // Add session data to the HTML
        data = data.replace('<!--#isLoggedIn#-->', isLoggedIn);
        data = data.replace('<!--#username#-->', username);

        res.send(data);
    });
});

//Getting the login page
app.get('/login', alreadyLoggedIn, (req, res) => {
    fs.readFile(__dirname+'/Public/HTML/Login.html', 'utf8', (err, data) => {
    if (err) {
            console.log(err);
            console.log(__dirname);
            console.log(__dirname+"/HTML/Login.html");
            res.status(500).send('Internal Server Error');
        }
        res.send(data);
    });
});

//Getting the signup page
app.get('/signup', alreadyLoggedIn, (req, res) => {
    fs.readFile(__dirname+'/Public/HTML/Signup.html', 'utf8', (err, data) => {
    if (err) {
            console.log(err);
            console.log(__dirname);
            console.log(__dirname+"/HTML/Signup.html");
            res.status(500).send('Internal Server Error');
        }
        
        res.send(data);
    });
})

//Getting the profile settings page
app.get('/settings', allowLoggedIn, (req, res) => {
    fs.readFile(__dirname+'/Public/HTML/Settings.html', 'utf8', (err, data) => {
        if(err) {
            console.log(err);
            console.log(__dirname);
            console.log(__dirname+"/HTML/Settings.html");
            res.status(500).send('Internal Server Error');
        }

        // Get session data
        // If the user is logged in, isLoggedIn will be true, otherwise it will be false
        const isLoggedIn = req.session.isLoggedIn;
        const username = req.session.user ? req.session.user.username : '';

        // Add session data to the HTML
        data = data.replace('<!--#isLoggedIn#-->', isLoggedIn);
        data = data.replace('<!--#username#-->', username);

        res.send(data);
    });
});

//Delete account
app.post('/deleteAccount', allowLoggedIn, async (req, res) => {

    const username = req.session.user.username;
    const password = req.body.password;
    console.log(req.body);
    console.log(req.session.user.username);
    //try catch to catch any errors
    try {
        const pool = await sql.connect(sqlConfig);
        const request = pool.request();

        // Use parameterized query to prevent SQL injection
        request.input('username', sql.VarChar, username);

        // First, check if the entered password matches the one in the database
        const result = await request.query('SELECT * FROM users WHERE username = @username');
        const user = result.recordset[0];

        if (user && await bcrypt.compare(password, user.password)) {
            // Passwords match, proceed with account deletion
            const deleteRequest = pool.request();
            deleteRequest.input('username', sql.VarChar, username);

            await deleteRequest.query('DELETE FROM users WHERE username = @username');
            req.session.destroy();
            res.status(200).redirect('/'); // Redirect to logout or another appropriate page
        } else {
            res.status(401).send('Invalid password');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

//Function to check if the users new password is vulnerable by using pwned password API to check if the password has been leaked before
async function checkPassword(password) {
    const sha1Hash = require('crypto').createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1Hash.slice(0, 5);
    const suffix = sha1Hash.slice(5);

    try {
        //getting the pwned password api to check hashed password
        const response = await axios.get(`https://api.pwnedpasswords.com/range/${prefix}`);
        const hashes = response.data.split('\n');

        for (const hash of hashes) {
            const [hashSuffix, count] = hash.split(':');
            if (hashSuffix === suffix) {
                return parseInt(count, 10);
            }
        }

        return 0; // Password not found in breaches
    } catch (error) {
        throw error;
    }
}

//Post method to handle register
app.post('/signup', async (req, res) => {

    console.log(req.body);
    //recaptcha response
    const captcha = req.body['g-recaptcha-response'];
    console.log('This is the captcha: ' + captcha);

    //Checking if the password is the same as the confirm password
    if (req.body.password !== req.body.confirmPassword) {
        res.status(400).send('Passwords do not match');
        return;
    }

    if (!captcha) {
        return res.status(400).send('reCAPTCHA not completed');
    }
    
    //Checking if the password is vulnerable
    //This is asynchronous so we need to have the rest of the code in the .then() method
    checkPassword(req.body.password).then(count => {
        if (count > 0) {
            console.log(`This password has been exposed in ${count} breaches.`);
            return res.status(400).send('This password has been exposed in a data breach. Please try a different password.');
        } else {
            console.log('This password has not been exposed in any known breaches.');
                //Hashing password
            bcrypt.hash(req.body.password, 10, (err, hash) => {
                if (err) {
                    console.log(err);
                    res.status(500).send('Please try a different username or password');
                    return;
                }
                //Connecting to the database
                sql.connect(sqlConfig, (err) => {
                    if (err) {
                        console.log(err);
                        res.status(500).send('Internal Server Error');
                        return;
                    }
                    //Creating a request object
                    const request = new sql.Request();

                    // Use parameterized query to prevent SQL injection
                    request.input('username', sql.VarChar, req.body.username);
                    request.input('password', sql.VarChar, hash);
                    request.query('INSERT INTO users (username, password) VALUES (@username, @password)', (err, result) => {
                        if (err) {
                            console.log(err);
                            res.status(500).send('Please try a different username or password');
                            return;
                        }
                        //Sending a success message
                        res.status(200).redirect('/login');
                    });
                });
            });
        }
    }).catch(error => {
        console.error(error);
    });
});

// Post method to handle login
app.post('/login', async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    try {
        await sql.connect(sqlConfig);

        const request = new sql.Request();
        request.input('username', sql.NVarChar, username); 

        //query to find the user with the username
        const result = await request.query(`SELECT * FROM Users WHERE username = @username`);

        const user = result.recordset[0];

        //checks if the password matches the hashed password in the database of the user and if their is a user with that username
        if (user && await bcrypt.compare(password, user.password)) {
            //setting the session variables
            req.session.isLoggedIn = true;
            req.session.user = { username: user.username };
            console.log(req.session.user);
            res.status(200).redirect('/');
        } else {
            res.status(401).send('<script>alert("Invalid credentials"); window.location="/login";</script>'); //sends an error and alert that the credentials are invalid and redirects back to login page
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    } finally {
        await sql.close();
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.status(200);
});

/**
 *  Applegreen UK	https://applegreenstores.com/fuel-prices/data.json
    Ascona Group	https://fuelprices.asconagroup.co.uk/newfuel.json
    Asda	https://storelocator.asda.com/fuel_prices_data.json
    bp	https://www.bp.com/en_gb/united-kingdom/home/fuelprices/fuel_prices_data.json
    Esso Tesco Alliance	https://www.esso.co.uk/-/media/Project/WEP/Esso/Esso-Retail-UK/roadfuelpricingscheme
    Morrisons	https://images.morrisons.com/petrol-prices/petrol.json
    Motor Fuel Group	https://fuel.motorfuelgroup.com/fuel_prices_data.json
    Rontec	https://www.rontec-servicestations.co.uk/fuel-prices/data/fuel_prices_data.json
    Sainsbury’s	https://api.sainsburys.co.uk/v1/exports/latest/fuel_prices_data.json
    SGN	https://www.sgnretail.uk/files/data/SGN_daily_fuel_prices.json
    Shell	https://www.shell.co.uk/fuel-prices-data.html
    Tesco	https://www.tesco.com/fuel_prices/fuel_prices_data.json
 */

//URLS available on government website for fuel prices in uk
const urls = [
    'https://applegreenstores.com/fuel-prices/data.json',
    'https://fuelprices.asconagroup.co.uk/newfuel.json',
    'https://storelocator.asda.com/fuel_prices_data.json',
    'https://www.bp.com/en_gb/united-kingdom/home/fuelprices/fuel_prices_data.json',
    'https://www.esso.co.uk/-/media/Project/WEP/Esso/Esso-Retail-UK/roadfuelpricingscheme',
    'https://images.morrisons.com/petrol-prices/petrol.json',
    'https://fuel.motorfuelgroup.com/fuel_prices_data.json',
    'https://www.rontec-servicestations.co.uk/fuel-prices/data/fuel_prices_data.json',
    'https://api.sainsburys.co.uk/v1/exports/latest/fuel_prices_data.json',
    'https://www.sgnretail.uk/files/data/SGN_daily_fuel_prices.json',
    'https://www.shell.co.uk/fuel-prices-data.html',
    'https://www.tesco.com/fuel_prices/fuel_prices_data.json'
];

//Function to get data from url
function getData(url, timeout) {
    return new Promise((resolve, reject) => {
        const getOptions = {
            headers: {
                'Accept-Encoding': 'gzip'
            }
        };

        //HTTPS get request
        //using gzip for compression
        const req = https.get(url, getOptions, (res) => {
            let data = '';
            
            const encoding = res.headers['content-encoding'];
            const stream = encoding === 'gzip' ? res.pipe(zlib.createGunzip()) : res;

            stream.on('data', (chunk) => {
                data += chunk;
            });

            stream.on('end', () => {
                resolve(data);
            });
        }).on('error', (err) => {
            reject(err);
        });

        req.on('timeout', () => {
            reject(new Error(`Request timed out for url: ${url}`));
        });

        req.setTimeout(timeout);
    });
}

//Timeout for get requests
const timeout = 1500; // 1.5 seconds

//GETTING THE DATA FROM THE URLS
app.get('/data', async (req, res) => {
    const responseData = [];

    for (const url of urls) {
        //throwing error in getData and catching it here
        try {
            //prints each url i am getting data from
            console.log(`Fetching data from ${url}`);

            //getting data from url
            const data = await getData(url, timeout);
            //if data is not empty then parse it and push it to responseData
            if (data.trim() !== "") {
                const parsedData = JSON.parse(data);
                parsedData.stations.forEach((station) => {
                    responseData.push(station);
                });
            }
        } catch (err) {
            console.error(`Error fetching data from ${url}:`, err);
        }
    }

    res.json(responseData);
});

//using an array of validation checks for the postcode and radius fields.
app.post('/search', [
    body('postcode').isPostalCode('GB').withMessage('Invalid Postcode'), //body('fieldname') specifies which field we're validating. .isPostalCode() checks if the field value is a valid postal code.
    body('radius').isFloat({min: 0, max: 100}).withMessage('Radius must be between 1 and 20 kilometers') //.isFloat({ min: 1, max: 20 }) checks if the field value is a float within the specified range.
], (req, res) => {
    console.log(req.body);
    const errors = validationResult(req);

    if(!errors.isEmpty()) {
        return res.status(422).json({error: 'Invalid postcode or radius'});
    }

    const postcode = req.body.postcode;
    const radius = parseFloat(req.body.radius);

    //using openstreetmap to get the long and lat of the postcode
    axios.get(`https://nominatim.openstreetmap.org/search?q=${postcode}&format=json`)
        .then(response => {
            const data = response.data;
            if (data.length > 0) {
                const centerLat = parseFloat(data[0].lat);
                const centerLon = parseFloat(data[0].lon);

                //success status and send centerLat, centerLon and radius back to the client
                res.status(200).json({centerLat: centerLat, centerLon: centerLon, radius: radius});
            } else {
                res.status(404).json({ error: 'Could not retrieve coordinates for the provided postcode.' });
            }
        })
        .catch(error => {
            console.error('Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        });
});

//handle 404 errors
//must be at the bottom of the file
app.use((req, res, next) => {
    res.status(404).sendFile(__dirname+'/Public/HTML/404.html');
});

//create HTTPS server
const server = https.createServer(options, app).listen(PORT, () => {
    console.log('Server running on port ' + PORT);
});

module.exports = {app, server};