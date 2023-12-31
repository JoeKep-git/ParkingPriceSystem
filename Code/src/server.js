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
const bcrypt = require('bcryptjs');
//For 2fa
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
//For encryption
const crypto = require('crypto');


//HTTPS Certificates
const options = {
    key: fs.readFileSync(__dirname+'/Certificates/server.key'),
    cert: fs.readFileSync(__dirname+'/Certificates/server.crt')
}
// function generateSecretKey() {
//     return crypto.randomBytes(32).toString('hex'); // Generates a random 256-bit (32-byte) key and converts it to hexadecimal
// }
// const secretKey = generateSecretKey();

//Copy and paste result into encryption secret key in .env file
// console.log('Generated Secret Key:', generateSecretKey());

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Specify the directory where your EJS templates are stored (assuming they're in a 'views' folder)
app.set('views', __dirname+'/Public/HTML');

// Function to encrypt data using AES
function encrypt(text, secretKey) {
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secretKey, 'hex'), Buffer.from(process.env.EIV, 'hex'));
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted.toString('hex');
}

// Function to decrypt data using AES
function decrypt(encryptedData, secretKey) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secretKey, 'hex'), Buffer.from(process.env.EIV, 'hex'));
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted.toString();
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
app.use('/images', express.static(__dirname+'/Public/Images'));

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
    if (req.session.isLoggedIn || req.session.is2FAVerified) {
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
    fs.readFile(__dirname+'/Public/HTML/Login.ejs', 'utf8', (err, data) => {
    if (err) {
            console.log(err);
            console.log(__dirname);
            console.log(__dirname+"/HTML/Login.ejs");
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

//Getting the tutorial page
app.get('/tutorial', (req, res) => {
    fs.readFile(__dirname+'/Public/HTML/Tutorial.html', 'utf8', (err, data) => {
        if(err) {
            console.log(err);
            console.log(__dirname);
            console.log(__dirname+"/HTML/Tutorial.html");
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
    } finally {
        await sql.close();
    }
});

//Change password
app.post('/changePassword', allowLoggedIn, async (req, res) => {
    const username = req.session.user.username;
    const currentPassword = req.body.currentPassword;
    const newPassword = req.body.newPassword;

    //try catch to catch any errors
    try {
        const pool = await sql.connect(sqlConfig);
        const request = pool.request();

        // Use parameterized query to prevent SQL injection
        request.input('username', sql.VarChar, username);

        // First, check if the entered password matches the one in the database
        const result = await request.query('SELECT * FROM users WHERE username = @username');
        const user = result.recordset[0];

        //checks if the current password matches the one in the database
        if (user && await bcrypt.compare(currentPassword, user.password)) {
            // Passwords match, proceed with password change
            bcrypt.hash(newPassword, 10, async (err, hash) => {
                if (err) {
                    console.log(err);
                    res.status(500).send(`<script>alert("Internal Server Error"); window.location.href="/settings"</script>`);
                    return;
                }

                const changeRequest = pool.request();
                changeRequest.input('username', sql.VarChar, username);
                changeRequest.input('password', sql.VarChar, hash);

                await changeRequest.query('UPDATE users SET password = @password WHERE username = @username');
                req.session.destroy();
                res.status(200).send(`<script>alert("Password changed successfully. Please log in again."); window.location.href="/login"</script>`);
            });
        } else {
            res.status(401).send(`<script>alert("Invalid password"); window.location.href="/settings"</script>`);
        }
    } catch (error) {
        console.error(error);
        res.status(500).send(`<script>alert("Internal Server Error"); window.location.href="/settings"</script>`);
    }   
});

//Generate qr code for 2fa
app.post('/setup2FA', allowLoggedIn, (req, res) => {
    const username = req.session.user.username;
    // Check if user already has a QR secret stored in the database
    sql.connect(sqlConfig, (err) => {
        if (err) {
            console.log(err);
            return res.status(500).json({success: false, error: 'Internal Server Error', url: '/settings'});
        }

        const request = new sql.Request();

        request.input('username', sql.VarChar, username);
        request.query('SELECT qrsecret FROM users WHERE username = @username', (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json('Internal Server Error');
            }

            if (result.recordset.length > 0 && result.recordset[0].qrsecret) {
                return res.status(400).json({success: false, error: 'QR already exists for user', url: '/settings'});
            }

            // Generate a new secret
            const secret = speakeasy.generateSecret();

            // Create a data URI for the QR code
            QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({success: false, error: 'Internal Server Error', url: '/settings'});
                }
                // Send the data URL to the client
                res.json({ success: true, secret: secret.base32, qrcode: data_url });
            });
        });
    });
});


//create 2fa
app.post('/create2FA', allowLoggedIn, (req, res) => {
    const userSubmittedCode = req.body.userSubmittedCode;
    const userSecret = req.body.userSecret;

    console.log(req.body);
    console.log(userSecret + ' ' + userSubmittedCode);
    // Verify the submitted code
    const isValid = speakeasy.totp.verify({
        secret: userSecret,
        encoding: 'base32',
        token: userSubmittedCode
    });
    console.log(isValid);
    if (isValid) {
        // Code is valid, save userSecret to the database
        const encryptedSecret = encrypt(userSecret, process.env.ENCRYPTION_SECRET);
       
        sql.connect(sqlConfig, (err) => {
            if (err) {
                console.log(err);
                return res.status(500).send('Internal Server Error');
            }

            const request = new sql.Request();

            request.input('username', sql.VarChar, req.session.user.username);
            request.input('qrsecret', sql.VarChar, encryptedSecret);

            request.query('UPDATE users SET qrsecret = @qrsecret WHERE username = @username', (err, result) => {
                if (err) {
                    console.log(err);
                    return res.status(500).send('Internal Server Error');
                } else {
                    return res.json({ success: true });
                }
            });
        });
    } else {
        res.json({ success: false, error: 'Invalid 2FA code' });
    }
});

app.post('/verify2FA', allowLoggedIn, (req, res) => {
    const userSubmittedCode = req.body.userSubmittedCode;
    console.log('User submitted code: ' + userSubmittedCode);
    sql.connect(sqlConfig, (err) => {
        if (err) {
            console.log(err);
            return res.status(500).json({success: false, error: 'Internal Server Error'});
        }

        const request = new sql.Request();

        request.input('username', sql.VarChar, req.session.user.username);
        request.query('SELECT qrsecret FROM users WHERE username = @username', (err, result) => {
            if (err) {
                console.log(err);
                return res.status(500).json({success: false, error: 'Internal Server Error'});
            }

            if (result.recordset.length > 0 && result.recordset[0].qrsecret) {
                const encryptedSecret = result.recordset[0].qrsecret;
                const decryptedSecret = decrypt(encryptedSecret, process.env.ENCRYPTION_SECRET);

                const isValid = speakeasy.totp.verify({
                    secret: decryptedSecret,
                    encoding: 'base32',
                    token: userSubmittedCode
                });
                console.log(result.recordset[0]);
                if (isValid) {
                    // Code is valid
                    req.session.is2FAVerified = true;
                    req.session.isLoggedIn = true;
                    res.status(200).json({ success: true });
                } else {
                    res.status(400).json({ success: false, error: 'Invalid 2FA code' });
                }
            } else {
                sql.close();
                res.status(400).json({ success: false, error: '2FA is not set up for this account' });
            }
        });
    });
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
                            sql.close();
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

        // Query to find the user with the username
        const result = await request.query(`SELECT * FROM Users WHERE username = @username`);

        const user = result.recordset[0];

        if (user && await bcrypt.compare(password, user.password)) {
            req.session.user = { username: user.username };
            if (user.QRSecret) {
                const has2FA = true;
                req.session.is2FAVerified = true;
                // User has a QR secret, ask for 2FA code
                res.render('login', { has2FA: has2FA });
            } else {
                // User doesn't have a QR secret, proceed with regular login
                req.session.isLoggedIn = true;
                res.redirect('/');
            }
        } else {
            res.status(401).send('<script>alert("Invalid credentials"); window.location="/login";</script>');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('<script>alert("Database error"); window.location="/login";</script>');
    } finally {
        await sql.close();
    }
});


app.post('/logout', (req, res) => {
    req.session.destroy();
    res.status(200).redirect('/');
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