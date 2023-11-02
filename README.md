# ParkingPriceSystem
This is for my project where I make a system to find the nearest cheapest petrol stations

Run the `docker-compose up -d --build` to run the application in Docker.

Make sure to create the database and table. SQL query for this is in the project files named `schema.sql`.

Change the name of `CHANGEME.env` to just `.env` and fill out the details. One way to get the keys for encryption is to run `crypto.randomBytes(16).toString('hex)` and print this, then copy to the .env file. This is for the IV. For the encryption key you do `crypto.randomBytes(32).toString('hex)` and copy it to the .env file.

Now you can connect to `https://localhost:8000`. You may get a warning that the website isn't safe, this is only because the certificate is self certified so the browser does not like it. This is still using the HTTPS protocol.

You can now go through and create an account, with or without 2FA, and find petrol station prices near you by inputting a post code and a max of 10 km distance.
