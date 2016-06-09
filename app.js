/**
 * Created by Softmasters on 6/1/2016.
 */

var Botkit = require('./lib/Botkit');
var client = require('./src/client');
var playerId = 0;
var tableid = 0;
var username;
var tables;


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
            //login
            controller.storage.users.get(message.user, function (err, user) {
                if (!user) {
                    user = {
                        id: message.user,
                    };
                }

                client.login(user.name, function (response) {
                    //tables = response;
                    user.playerId = response.player.id;
                    playerId = response.player.id;
                    bot.reply(message, "your Player Id :" + user.playerId)
                    //display tables and users in the table
                    tables = response.tables;
                    controller.storage.users.save(user, function (err, id) {
                    })
                    bot.reply(message,
                        {
                            attachment: {
                                type: "template",
                                payload: {
                                    template_type: "generic",
                                    elements: [
                                        {
                                            title: "Table 1",
                                            image_url: "http://i.imgur.com/dmkDnSb.jpg",
                                            subtitle: tables[1].numPlayers + " players, State: " + tables[1].state,
                                            buttons: [
                                                {
                                                    type: "postback",
                                                    title: "Join",
                                                    payload: "1"
                                                }
                                            ]
                                        }
                                        , {
                                            title: "Table 2",
                                            image_url: "http://i.imgur.com/dmkDnSb.jpg",
                                            subtitle: tables[2].numPlayers + " players , State: " + tables[2].state,
                                            buttons: [
                                                {
                                                    type: "postback",
                                                    title: "Join",
                                                    payload: "2"
                                                }
                                            ]
                                        },
                                        {
                                            title: "Table 3",
                                            image_url: "http://i.imgur.com/dmkDnSb.jpg",
                                            subtitle: tables[3].numPlayers + " players , State: " + tables[3].state,
                                            buttons: [
                                                {
                                                    type: "postback",
                                                    title: "Join",
                                                    payload: "3"
                                                }
                                            ]
                                        },
                                        {
                                            title: "Table 4",
                                            image_url: "http://i.imgur.com/dmkDnSb.jpg",
                                            subtitle: tables[4].numPlayers + " players , State: " + tables[4].state,
                                            buttons: [
                                                {
                                                    type: "postback",
                                                    title: "Join",
                                                    payload: "4"
                                                }

                                            ]
                                        }, {
                                            title: "Table 5",
                                            image_url: "http://i.imgur.com/dmkDnSb.jpg",
                                            subtitle: tables[5].numPlayers + " players , State: " + tables[5].state,
                                            buttons: [
                                                {
                                                    type: "postback",
                                                    title: "Join",
                                                    payload: "5"
                                                }

                                            ]
                                        }, {
                                            title: "Table 6",
                                            image_url: "http://i.imgur.com/dmkDnSb.jpg",
                                            subtitle: tables[6].numPlayers + " players , State: " + tables[6].state,
                                            buttons: [
                                                {
                                                    type: "postback",
                                                    title: "Join",
                                                    payload: "6"
                                                }

                                            ]
                                        }
                                    ]
                                }
                            }
                        }
                    );
                })
            });

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
        case '1':
            //call function to perform stand operation
            //player:
            //{ id: 1,
            //    name: 'Danny',
            //    credits: 1000,
            //    online: true,
            //    tableId: 1,
            //    bet: -1,
            //    hand: [],
            //    busted: false,
            //    done: false } }

            controller.storage.users.get(message.user, function (err, user) {
                if (!user) {
                    user = {
                        id: message.user,
                    };
                }
                console.log(playerId);
                client.joinTable(user.playerId, 1, function (response) {
                    if (response.player.busted == false) {
                        bot.reply(message, "You are Table 1 with id" + playerId)
                        bot.reply(message, "You have credit of " + response.player.credits + "$")
                        bot.reply(message, "How much do you want to bet")
                    }
                })

            });
            break
        case '2':
            //call function to perform stand operation
            controller.storage.users.get(message.user, function (err, user) {
                if (!user) {
                    user = {
                        id: message.user,
                    };
                }
                console.log(playerId);
                client.joinTable(user.playerId, 1, function (response) {
                    if (response.player.busted == false) {
                        bot.reply(message, "You are Table 2 with id" + playerId)
                        bot.reply(message, "You have credit of " + response.player.credits + "$")
                        bot.reply(message, "How much do you want to bet")
                    }
                })

            });
            break
        case '3':
            //call function to perform stand operation
            controller.storage.users.get(message.user, function (err, user) {
                if (!user) {
                    user = {
                        id: message.user,
                    };
                }
                console.log(playerId);
                client.joinTable(user.playerId, 1, function (response) {
                    if (response.player.busted == false) {
                        bot.reply(message, "You are Table 3 with id" + playerId)
                        bot.reply(message, "You have credit of " + response.player.credits + "$")
                        bot.reply(message, "How much do you want to bet")
                    }
                })

            });
            break
    }
})

askName = function (response, convo) {
    client.login(response.text, function (response) {
        //tables = response;
        playerId = response.player.id;
    })
}

