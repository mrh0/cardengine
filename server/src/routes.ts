import express = require('express');
import path = require('path');
export const  app = express()

const __dirname_client = path.join(__dirname+'/../../../client/build')

app.get('/', function (req, res) {
    res.sendFile((path.join(__dirname_client+'/landing.html')))
})

app.get('/uno/', function (req, res) {
    res.sendFile((path.join(__dirname_client+'/uno/uno.html')))
})

app.get('/uno/:lobby', function (req, res) {
    res.sendFile((path.join(__dirname_client+'/uno/uno.html')))
})

app.get('/service/uno/', function (req, res) {
    //res.send();
    res.sendFile((path.join(__dirname+'/../../service.txt')))
})

app.use('/', express.static(path.join(__dirname_client + '/public')));