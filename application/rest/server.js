const express = require('express');
const app = express();
let path = require('path');
let sdk = require('./sdk');

const PORT = 8001;
const HOST = '0.0.0.0';

app.use(express.json());
app.use(express.urlencoded({ extended: true }))

app.post('/init', function (req, res) {
   const {CardName, CardNum, Username, Exdate, Password} = req.body;
   const args = [CardName, CardNum, Username, Exdate, Password];
   sdk.send(false, 'Init', args, res);
});

app.get('/add_balance', function (req, res) {
   const {CardName, amount} = req.query;
   const args = [CardName, amount.toString()];
   sdk.send(false, 'AddBalance', args, res);
});

app.get('/queryall', function (req, res) {
   sdk.send(true, 'GetAllQuery', [], res);
});

app.use(express.static(path.join(__dirname, '../client')));
app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);