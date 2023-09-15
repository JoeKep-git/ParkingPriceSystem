const http = require('http')
const port = 8000
const fs = require('fs');
const express = require("express");
const app = express();

app.get('/', (req, res) => {
    fs.readFile('/app/HTML/Main.html', 'utf8', (err, data) => {
    if (err) {
            console.log(err);
            console.log(__dirname+"/Main.html");
            res.status(500).send('Internal Server Error');
        }
        res.send(data);
    });
});

app.listen(port, () => { console.log(`Server is running on port ${port}`) });
