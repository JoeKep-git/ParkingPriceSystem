const https = require('https')
const fs = require('fs');
const express = require("express");
const app = express();
const env = require('dotenv').config();
const axios = require('axios');
const request = require('request-promise');
const zlib = require('zlib');

//HTTPS Certificates
const options = {
    key: fs.readFileSync(__dirname+'/Certificates/server.key'),
    cert: fs.readFileSync(__dirname+'/Certificates/server.crt')
}

//SERVER PORT
const PORT = process.env.PORT || 8000;

//Serving static files
app.use(express.static(__dirname+'/Public'));

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

//TODO: try and get the bing api to work on backend and then send the data to the frontend
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
const timeout = 1000; // 1 seconds

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

//create HTTPS server
const server = https.createServer(options, app).listen(PORT, () => {
    console.log('Server running on port ' + PORT);
});