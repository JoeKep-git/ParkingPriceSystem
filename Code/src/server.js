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

//HTTPS Certificates
const options = {
    key: fs.readFileSync(__dirname+'/Certificates/server.key'),
    cert: fs.readFileSync(__dirname+'/Certificates/server.crt')
}

//SERVER PORT
const PORT = process.env.PORT || 8000;

//Serving static files
app.use(express.static(__dirname+'/Public'));
app.use(express.json());

//GETTING THE MAIN PAGE
app.get('/', (req, res) => {
    fs.readFile(__dirname+'/Public/HTML/Main.html', 'utf8', (err, data) => {
    if (err) {
            console.log(err);
            console.log(__dirname);
            console.log(__dirname+"/HTML/Main.html");
            res.status(500).send('Internal Server Error');
        }
        res.send(data);
    });
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

//create HTTPS server
const server = https.createServer(options, app).listen(PORT, () => {
    console.log('Server running on port ' + PORT);
});