const https = require('https')
const fs = require('fs');
const express = require("express");
const app = express();
const env = require('dotenv').config();

//HTTPS Certificates
const options = {
    key: fs.readFileSync(__dirname+'/Certificates/server.key'),
    cert: fs.readFileSync(__dirname+'/Certificates/server.crt')
}
 


//SERVER PORT
const PORT = process.env.PORT || 8000;

//GETTING THE MAIN PAGE
app.get('/', (req, res) => {
    fs.readFile(__dirname+'/HTML/Main.html', 'utf8', (err, data) => {
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

//TODO: read json links and display them on the map

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

//create HTTPS server
const server = https.createServer(options, app).listen(PORT, () => {
    console.log('Server running on port ' + PORT);
});