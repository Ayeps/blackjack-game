/**
 * Created by Softmasters on 6/1/2016.
 */

var Botkit = require('./lib/Botkit');
var client = require('./src/client');
var playerId = 0;
var tableid = 0;
var username;


var controller = Botkit.facebookbot({
    access_token: process.env.access_token,
    verify_token: process.env.verify_token,
})

var bot = controller.spawn({});


controller.setupWebserver(process.env.PORT || 5000, function (err, webserver) {
    controller.createWebhookEndpoints(controller.webserver, bot, function () {
        console.log('This bot is online!!!');
    });
})

controller.on('facebook_optin', function (bot, message) {
    bot.reply(message, 'Hello');
    bot.reply(message, 'Hi, my name is Pepper and I am your Black Jack Dealer.Would you like to play a round?!');
    bot.reply(message, {
        attachment: {
            type: 'template',
            payload: {
                template_type: 'button',
                text: 'Option',
                buttons: [
                    {
                        type: 'postback',
                        title: 'yes',
                        payload: 'yes'
                    },
                    {
                        type: 'postback',
                        title: 'yes',
                        payload: 'yes'
                    }
                ]
            }
        }
    })
})

controller.hears('message_received', function (bot, message) {
    bot.reply(message, 'Sorry i did not get that!');
    bot.reply(message, 'Have a nice day!');
})

controller.hears(['hello', 'hi'], 'message_received', function (bot, message) {
    controller.storage.users.get(message.user, function (err, user) {
        if (user && user.name) {
            bot.reply(message, 'Hello ' + user.name + '!!');
        } else {
            bot.reply(message, 'Hi, my name is Pepper and I am your Black Jack Dealer.!');
            bot.startConversation(message, function (err, convo) {
                if (!err) {
                    convo.ask('What should I call you?', function (response, convo) {
                        convo.ask('You want me to call you ' + response.text + '? (yes/no)', [{
                            pattern: 'yes',
                            callback: function (response, convo) {
                                // since no further messages are queued after this,
                                // the conversation will end naturally with status == 'completed'
                                convo.next();
                            }
                        }, {
                            pattern: 'no',
                            callback: function (response, convo) {
                                // stop the conversation. this will cause it to end with status == 'stopped'
                                convo.stop();
                            }
                        }, {
                            default: true,
                            callback: function (response, convo) {
                                convo.repeat();
                                convo.next();
                            }
                        }]);

                        convo.next();

                    }, {
                        'key': 'nickname'
                    }); // store the results in a field called nickname

                    convo.on('end', function (convo) {
                        if (convo.status == 'completed') {

                            controller.storage.users.get(message.user, function (err, user) {
                                if (!user) {
                                    user = {
                                        id: message.user,
                                    };
                                }
                                user.name = convo.extractResponse('nickname');

                                controller.storage.users.save(user, function (err, id) {
                                    bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
                                    bot.reply(message,
                                        {
                                            attachment: {
                                                type: "template",
                                                payload: {
                                                    template_type: "generic",
                                                    elements: [
                                                        {
                                                            title: "Would you like to play a round?",
                                                            buttons: [
                                                                {
                                                                    type: "postback",
                                                                    title: "YES",
                                                                    payload: "yes"
                                                                },
                                                                {
                                                                    type: "postback",
                                                                    title: "NO",
                                                                    payload: "no"
                                                                }
                                                            ]
                                                        }
                                                    ]
                                                }
                                            }
                                        }
                                    );
                                });
                            });
                        } else {
                            // this happens if the conversation ended prematurely for some reason
                            bot.reply(message, 'OK, nevermind!');

                        }
                    });
                }
            });

        }
    });
})

controller.hears(['bet', '^pattern$'], ['message_received'], function (bot, message) {

    // do something to respond to message
    bot.reply(message, 'your bet of ' + message.text + ' recieved!');
    bot.reply(message,
        {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [
                        {
                            title: "Classic White T-Shirt",
                            image_url: "http://petersapparel.parseapp.com/img/item100-thumb.png",
                            subtitle: "Soft white cotton t-shirt is back in style",
                            buttons: [
                                {
                                    type: "postback",
                                    title: "HIT",
                                    payload: "hit"
                                },
                                {
                                    type: "postback",
                                    title: "STAND",
                                    payload: "stand"
                                }
                            ]
                        }
                    ]
                }
            }
        }
    );

});


controller.on('facebook_postback', function (bot, message) {
    switch (message.payload) {
        case 'yes':
            bot.reply(message, "How much do you want to bet")
            break
        case 'no':
            bot.reply(message, "Thank for playing the game with us")
            break
        case 'hit':
            //call function to perform hit operation
            bot.reply(message, "you decided to hit")
            break
        case 'stand':
            //call function to perform stand operation
            bot.reply(message, "you decide to stand")
            break
    }
})

askName = function (response, convo) {
    convo.ask("What is your name?", function (response, convo) {
        var name = response.text;
        controller.storage.users.get(message.user, function (err, user) {
            if (!user) {
                user = {
                    id: message.user,
                };
            }
            user.name = name;
            controller.storage.users.save(user, function (err, id) {
                bot.reply(message, 'Got it. I will call you ' + user.name + ' from now on.');
            });
        });
        convo.say("Awesome.");
        convo.next();
    });
}