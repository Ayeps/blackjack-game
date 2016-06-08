/**
 * Created by Softmasters on 6/8/2016.
 */
var express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var Botkit = require('botkit');
var app = express();
app.set('port', (process.env.PORT || 5000))
// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))
// Process application/json
app.use(bodyParser.json())

// Index route
app.get('/', function (req, res) {
    res.send('Hello world, I am a chat bot')
})


var controller = Botkit.facebookbot({
    access_token: process.env.access_token,
    verify_token: process.env.verify_token,
})

var bot = controller.spawn({});

controller.setupWebserver(process.env.PORT || 5000, function (err, webserver) {
    controller.createWebhookEndpoints(webserver, bot, function () {
        console.log('This bot is online!!!');
    });
})

