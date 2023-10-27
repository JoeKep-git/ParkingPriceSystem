//if i need assert i have the value here
var assert = require('assert');
const request = require('supertest');
const chai = require('chai');
const expect = chai.expect;
const {app, server} = require('../server.js');

//routing the requests through my server.js file

describe('POST /search', () => {
    it('should return error for invalid postcode', async () => {
        const response = await request(app)
            .post('/search')
            .send({ postcode: 'INVALID', radius: 10 });

        expect(response.status).to.equal(422); //expecting a 422 status code
    });

    it('should return coordinates for valid postcode', async () => {
        const response = await request(app)
            .post('/search')
            .send({ postcode: 'EN80EJ', radius: 10 });

        expect(response.status).to.equal(200); //expecting a 200 status code
    });
});

describe('GET /test', () => {
    it('should return a success message', async () => {
        const response = await request(app).get('/');

        expect(response.status).to.equal(200);
    });
});

//end server connection when testing finished
after((done) => {
    server.close(done);
})