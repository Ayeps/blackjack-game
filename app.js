/**
 * Created by Softmasters on 6/1/2016.
 */
var Botkit = require('botkit');
var client = require('./src/client');
var Cards = require('./src/cards');
var assert = require('assert');
var is = require('is2');
var _ = require('lodash');
var fs = require('fs');
var player = require('./src/player')
var playerId = 1;
var tables;
var mongoStorage = require('botkit-storage-mongo')({mongoUri: process.env.mongo_uri});
var controller = Botkit.facebookbot({
    access_token: process.env.access_token,
    verify_token: process.env.verify_token,
    storage: mongoStorage
})

var bot = controller.spawn({});

controller.setupWebserver(process.env.PORT || 5000, function (err, webserver) {
    controller.createWebhookEndpoints(controller.webserver, bot, function () {
        console.log('This bot is online!!!');
    });
});


displayHand = function (txt, hand, message, bot, _) {
    assert.ok(is.str(txt));
    assert.ok(is.nonEmptyArray(hand));
    console.log(hand);
    _.forEach(hand, function (c) {
        if (is.str(c)) {
            //printf('    %s\n', c);
            bot.reply(message, c);
        } else if (is.int(c) && c > -1) {
            var card = Cards.getCard(c);
            //printf('%s of %s\n', card.rank, card.suit);
            bot.reply(message, txt + ":" + card.rank + " " + card.suit + " " + card.code);
            bot.reply(message, {
                attachment: {
                    type: 'image',
                    payload: {
                        url: card.image
                    }
                }
            })
        } else {
            assert.ok(false);
        }
    });
}

gamepromt = function (bot, message) {
    bot.reply(message,
        {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [
                        {
                            title: "Would you like to play another round?",
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
}


continuegame = function (bot, message) {
    bot.reply(message,
        {
            attachment: {
                type: "template",
                payload: {
                    template_type: "generic",
                    elements: [
                        {
                            title: "HIT or STAND?",
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
}

sendmessage = function (bot, message, text) {
    bot.reply(message, text);
}
displayHands = function (response, message, bot, playerId, _) {
    console.log(playerId + " is the player id");
    var table = response.table;
    var player = response.player;
    assert.ok(is.nonEmptyObj(table));
    var dealerHand = table.dealer.hand;
    var yourHand;
    var playoption = null;
    displayHand('Dealers hand:', dealerHand, message, bot, _);
    if (is.positiveInt(player.bet)) {
        yourHand = table.players[playerId].hand;
        displayHand('Your hand:', yourHand, message, bot, _);
        playoption = 'continue';
    } else if (player.bet === -1 && is.obj(player.result)) {
        yourHand = player.result.players[playerId].hand;
        displayHand('Your hand:', yourHand, message, bot, _);
        playoption = 'playeagain';
        if (player.result.players[playerId].push) {
            bot.reply(message, 'Push. You have' + player.credits + 'credits.');
            playoption = 'playagain';
        } else {
            bot.reply(message, 'You ' + (player.result.players[playerId].win ? 'won' : 'lost') + ',' + player.result.players[playerId].bet + ' and currently have ' + player.credits + ' credits.');
            playoption = 'playagain';
        }

    }
    return playoption;
}
controller.on('facebook_optin', function (bot, message) {
    bot.reply(message, "Welcome to Blackjack ...");
    bot.reply(message, 'Hi, my name is Pepper and I am your Black Jack Dealer.!');
});
controller.hears(['hello', 'hi', '(.*)play(.*)', 'start', 'can we start?', 'Hallo', 'Give me a card', 'new game'], 'message_received', function (bot, message) {
    controller.storage.users.get(message.user, function (err, user) {
        if (user && user.name) {
            bot.reply(message, 'Hello ' + user.name + '!!');
            bot.reply(message, 'Welcome back back');
            bot.reply(message, 'You have ' + user.money + '$');
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
controller.hears(['(.*)(Lets) (.*)go(.*)'], 'message_received', function (bot, message) {
    bot.reply(message, "Great, there you are – do you remember where we left off? – Just scroll" +
        " above to check or type ,new game“…");
    return false;
});
controller.hears(['With how many card games do we play'], 'message_received', function (bot, message) {
    bot.reply(message, "We play with 2 decks of cards. That is less than in the typical casino" +
        " and means your chances to win are higher!");
    return false;
});
controller.hears(['are you hot?'], 'message_received', function (bot, message) {
    bot.reply(message, "Definitely this is a picture of me , but i'm hear to play blackjack with you");
    bot.reply(message, {
        attachment: {
            type: 'image',
            payload: {
                title: 'hi',
                url: 'http://i.imgur.com/1WuDC6y.jpg'
            }
        }
    })


    return false;
});
controller.hears(['(.*)rules(.*)'], 'message_received', function (bot, message) {
    var text = "BlackJackBot available  commands: help, rules, join, leave, start, bet, hand, surrender, hit, stand, split, doubleDown The game is a 3-2 payout soft bet and stand till 17";
    sendmessage(bot, message, text);
});


controller.hears(['data'], 'message_received', function (bot, message) {
    var text = "BlackJackBot available  commands: help, rules, join, leave, start, bet, hand, surrender, hit, stand, split, doubleDown The game is a 3-2 payout soft bet and stand till 17";

    controller.storage.users.get(message.user, function (err, user) {
        if (!user) {
            user = {
                id: message.user,
            };
        }
        user.playerId = 5;
        user.name = "Testing";
        //user.money = response.playerId;

        var date = new Date();


        user.lastdate = date;

        var history = {
            time: date,
            money: 569
        }

        user.history = history;

        controller.storage.users.save(user, function (err, id) {
        })
    });


    sendmessage(bot, message, text);
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
                console.log(user.name);
                client.login(user.name, function (response) {
                    //tables = response;
                    console.log(response);
                    console.log("login resposne");
                    console.log("player id" + response.playerId);
                    user.playerId = response.playerId;
                    //user.money = response.playerId;
                    playerId = response.playerId;
                    controller.storage.users.save(user, function (err, id) {
                    })
                    bot.reply(message, "your Player Id :" + user.playerId)
                    //display tables and users in the table
                    tables = response.tables;
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
            controller.storage.users.get(message.user, function (err, user) {
                if (!user) {
                    user = {
                        id: message.user,
                    };
                }
                console.log(playerId);
                client.leaveTable(user.playerId, function (response) {
                    //response.
                })

            });
            bot.reply(message, "Thanks for playing the game with us")
            break
        case 'hit':
            //call function to perform hit operation
            controller.storage.users.get(message.user, function (err, user) {
                if (!user) {
                    user = {
                        id: message.user,
                    };
                }
                client.hit(user.playerId, function (response) {
                    var option = displayHands(response, message, bot, user.playerId, _);
                    //save mount player has
                    if (option === 'playagain') {
                        user.money = (parseInt(user.money) + parseInt(response.player.credits)) + "";
                        ;

                        console.log("amount paid" + (parseInt(user.money) + parseInt(response.player.credits)));
                        //playerId = response.playerId;
                        controller.storage.users.save(user, function (err, id) {
                        })
                        console.log(playerId);
                        client.leaveTable(user.playerId, function (response) {
                            //response.
                        })
                        gamepromt(bot, message)
                    }
                    else {
                        continuegame(bot, message);
                    }

                })
            });
            break
        case 'stand':
            controller.storage.users.get(message.user, function (err, user) {
                if (!user) {
                    user = {
                        id: message.user,
                    };
                }

                client.stand(user.playerId, function (response) {
                    var option = displayHands(response, message, bot, user.playerId, _);
                    //where to save player money
                    if (option === 'playagain') {
                        user.money = (parseInt(user.money) + parseInt(response.player.credits)) + "";

                        console.log(response.player.credits);
                        console.log("amount paid" + (parseInt(user.money) + parseInt(response.player.credits)));
                        //playerId = response.playerId;
                        controller.storage.users.save(user, function (err, id) {
                        })

                        console.log(playerId);
                        client.leaveTable(user.playerId, function (response) {
                            //response.
                        })
                        gamepromt(bot, message)
                    }
                    else {
                        continuegame(bot, message);
                    }
                })
            });
            break
        case '1':
            controller.storage.users.get(message.user, function (err, user) {
                if (!user) {
                    user = {
                        id: message.user,
                    };
                }
                console.log("before join" + user.playerId);
                client.joinTable(user.playerId, 1, function (response) {
                    if (response.player.busted == false) {
                        bot.reply(message, "You are  on Table 1 with id" + playerId)
                        bot.reply(message, "You have credit of " + response.player.credits + "$")
                        bot.startConversation(message, function (err, convo) {
                            if (!err) {
                                convo.ask('How much do want to bet?', function (response, convo) {
                                    convo.ask('You want me to call you ' + response.text + '? (yes/no)', [{
                                        pattern: 'yes',
                                        callback: function (response, convo) {
                                            console.log(response.text);
                                            var text = response.text;
                                            var amt = text.replace(/\D+/g, '');
                                            console.log("amount bet ==>" + amt);
                                            // since no further messages are queued after this,
                                            // the conversation will end naturally with status == 'completed'
                                            convo.next();
                                        }
                                    }, {
                                        pattern: 'no',
                                        callback: function (response, convo) {
                                            // stop the conversation. this will cause it to end with status == 'stopped'
                                            convo.repeat();
                                            convo.next();
                                        }
                                    }, {
                                        default: true,
                                        callback: function (response, convo) {
                                            convo.repeat();
                                            convo.next();
                                        }
                                    }]);
                                    convo.next();
                                }); // store the results in a field called nickname

                                convo.on('end', function (convo) {
                                    if (convo.status == 'completed') {
                                        controller.storage.users.get(message.user, function (err, user) {
                                            if (!user) {
                                                user = {
                                                    id: message.user,
                                                };
                                            }
                                            message.money -= 100;
                                            controller.storage.users.save(user, function (err, id) {
                                                client.bet(user.playerId, 100, function (response) {
                                                    if (response.success === true) {
                                                        displayHands(response, message, bot, user.playerId, _);
                                                        bot.reply(message,
                                                            {
                                                                attachment: {
                                                                    type: "template",
                                                                    payload: {
                                                                        template_type: "generic",
                                                                        elements: [
                                                                            {
                                                                                title: "Do you want to hit or Stand",
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
                                                                                    , {
                                                                                        type: "postback",
                                                                                        title: "Insurance",
                                                                                        payload: "insure"
                                                                                    }
                                                                                ]
                                                                            }
                                                                        ]
                                                                    }
                                                                }
                                                            });
                                                    } else {
                                                        console.log(response);
                                                        bot.reply(message, "Please type play to join a table");
                                                    }
                                                });
                                            });
                                        });
                                    }
                                });
                            }
                        });

                    }
                });
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
                client.joinTable(user.playerId, 2, function (response) {
                    if (response.player.busted == false) {
                        bot.reply(message, "You are  on Table 2 with id" + playerId)
                        bot.reply(message, "You have credit of " + response.player.credits + "$")
                        bot.startConversation(message, function (err, convo) {
                            if (!err) {
                                convo.ask('How much do want to bet?', function (response, convo) {
                                    convo.ask('You want me to call you ' + response.text + '? (yes/no)', [{
                                        pattern: 'yes',
                                        callback: function (response, convo) {
                                            console.log(response.text);
                                            var text = response.text;
                                            var amt = text.replace(/\D+/g, '');
                                            console.log("amount bet ==>" + amt);
                                            // since no further messages are queued after this,
                                            // the conversation will end naturally with status == 'completed'
                                            convo.next();
                                        }
                                    }, {
                                        pattern: 'no',
                                        callback: function (response, convo) {
                                            // stop the conversation. this will cause it to end with status == 'stopped'
                                            convo.repeat();
                                            convo.next();
                                        }
                                    }, {
                                        default: true,
                                        callback: function (response, convo) {
                                            convo.repeat();
                                            convo.next();
                                        }
                                    }]);
                                    convo.next();
                                }); // store the results in a field called nickname

                                convo.on('end', function (convo) {
                                    if (convo.status == 'completed') {
                                        controller.storage.users.get(message.user, function (err, user) {
                                            if (!user) {
                                                user = {
                                                    id: message.user,
                                                };
                                            }
                                            message.money -= 100;
                                            controller.storage.users.save(user, function (err, id) {
                                                client.bet(user.playerId, 100, function (response) {
                                                    if (response.success === true) {
                                                        displayHands(response, message, bot, user.playerId, _);
                                                        bot.reply(message,
                                                            {
                                                                attachment: {
                                                                    type: "template",
                                                                    payload: {
                                                                        template_type: "generic",
                                                                        elements: [
                                                                            {
                                                                                title: "Do you want to hit or Stand",
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
                                                                                    , {
                                                                                        type: "postback",
                                                                                        title: "Insurance",
                                                                                        payload: "insure"
                                                                                    }
                                                                                ]
                                                                            }
                                                                        ]
                                                                    }
                                                                }
                                                            });
                                                    } else {
                                                        console.log(response);
                                                        bot.reply(message, "Please type play to join a table");
                                                    }
                                                });
                                            });
                                        });
                                    }
                                });
                            }
                        });

                    }
                });
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
                client.joinTable(user.playerId, 3, function (response) {
                    if (response.player.busted == false) {
                        bot.reply(message, "You are  on Table 3 with id" + playerId)
                        bot.reply(message, "You have credit of " + response.player.credits + "$")
                        bot.startConversation(message, function (err, convo) {
                            if (!err) {
                                convo.ask('How much do want to bet?', function (response, convo) {
                                    convo.ask('You want me to call you ' + response.text + '? (yes/no)', [{
                                        pattern: 'yes',
                                        callback: function (response, convo) {
                                            console.log(response.text);
                                            var text = response.text;
                                            var amt = text.replace(/\D+/g, '');
                                            console.log("amount bet ==>" + amt);
                                            // since no further messages are queued after this,
                                            // the conversation will end naturally with status == 'completed'
                                            convo.next();
                                        }
                                    }, {
                                        pattern: 'no',
                                        callback: function (response, convo) {
                                            // stop the conversation. this will cause it to end with status == 'stopped'
                                            convo.repeat();
                                            convo.next();
                                        }
                                    }, {
                                        default: true,
                                        callback: function (response, convo) {
                                            convo.repeat();
                                            convo.next();
                                        }
                                    }]);
                                    convo.next();
                                }); // store the results in a field called nickname

                                convo.on('end', function (convo) {
                                    if (convo.status == 'completed') {
                                        controller.storage.users.get(message.user, function (err, user) {
                                            if (!user) {
                                                user = {
                                                    id: message.user,
                                                };
                                            }
                                            message.money -= 100;
                                            controller.storage.users.save(user, function (err, id) {
                                                client.bet(user.playerId, 100, function (response) {
                                                    if (response.success === true) {
                                                        displayHands(response, message, bot, user.playerId, _);
                                                        bot.reply(message,
                                                            {
                                                                attachment: {
                                                                    type: "template",
                                                                    payload: {
                                                                        template_type: "generic",
                                                                        elements: [
                                                                            {
                                                                                title: "Do you want to hit or Stand",
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
                                                                                    , {
                                                                                        type: "postback",
                                                                                        title: "Insurance",
                                                                                        payload: "insure"
                                                                                    }
                                                                                ]
                                                                            }
                                                                        ]
                                                                    }
                                                                }
                                                            });
                                                    } else {
                                                        console.log(response);
                                                        bot.reply(message, "Please type play to join a table");
                                                    }
                                                });
                                            });
                                        });
                                    }
                                });
                            }
                        });

                    }
                });

            });
            break
        case '4':
            //call function to perform stand operation
            controller.storage.users.get(message.user, function (err, user) {
                if (!user) {
                    user = {
                        id: message.user,
                    };
                }
                console.log(playerId);
                client.joinTable(user.playerId, 4, function (response) {
                    if (response.player.busted == false) {
                        bot.reply(message, "You are  on Table 4 with id" + playerId)
                        bot.reply(message, "You have credit of " + response.player.credits + "$")
                        bot.startConversation(message, function (err, convo) {
                            if (!err) {
                                convo.ask('How much do want to bet?', function (response, convo) {
                                    convo.ask('You want me to call you ' + response.text + '? (yes/no)', [{
                                        pattern: 'yes',
                                        callback: function (response, convo) {
                                            console.log(response.text);
                                            var text = response.text;
                                            var amt = text.replace(/\D+/g, '');
                                            console.log("amount bet ==>" + amt);
                                            // since no further messages are queued after this,
                                            // the conversation will end naturally with status == 'completed'
                                            convo.next();
                                        }
                                    }, {
                                        pattern: 'no',
                                        callback: function (response, convo) {
                                            // stop the conversation. this will cause it to end with status == 'stopped'
                                            convo.repeat();
                                            convo.next();
                                        }
                                    }, {
                                        default: true,
                                        callback: function (response, convo) {
                                            convo.repeat();
                                            convo.next();
                                        }
                                    }]);
                                    convo.next();
                                }); // store the results in a field called nickname

                                convo.on('end', function (convo) {
                                    if (convo.status == 'completed') {
                                        controller.storage.users.get(message.user, function (err, user) {
                                            if (!user) {
                                                user = {
                                                    id: message.user,
                                                };
                                            }
                                            message.money -= 100;
                                            controller.storage.users.save(user, function (err, id) {
                                                client.bet(user.playerId, 100, function (response) {
                                                    if (response.success === true) {
                                                        displayHands(response, message, bot, user.playerId, _);
                                                        bot.reply(message,
                                                            {
                                                                attachment: {
                                                                    type: "template",
                                                                    payload: {
                                                                        template_type: "generic",
                                                                        elements: [
                                                                            {
                                                                                title: "Do you want to hit or Stand",
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
                                                                                    , {
                                                                                        type: "postback",
                                                                                        title: "Insurance",
                                                                                        payload: "insure"
                                                                                    }
                                                                                ]
                                                                            }
                                                                        ]
                                                                    }
                                                                }
                                                            });
                                                    } else {
                                                        console.log(response);
                                                        bot.reply(message, "Please type play to join a table");
                                                    }
                                                });
                                            });
                                        });
                                    }
                                });
                            }
                        });

                    }
                });

            });
            break
        case '5':
            //call function to perform stand operation
            controller.storage.users.get(message.user, function (err, user) {
                if (!user) {
                    user = {
                        id: message.user,
                    };
                }
                console.log(playerId);
                client.joinTable(user.playerId, 5, function (response) {
                    if (response.player.busted == false) {
                        bot.reply(message, "You are  on Table 5 with id" + playerId)
                        bot.reply(message, "You have credit of " + response.player.credits + "$")
                        bot.startConversation(message, function (err, convo) {
                            if (!err) {
                                convo.ask('How much do want to bet?', function (response, convo) {
                                    convo.ask('You want me to call you ' + response.text + '? (yes/no)', [{
                                        pattern: 'yes',
                                        callback: function (response, convo) {
                                            console.log(response.text);
                                            var text = response.text;
                                            var amt = text.replace(/\D+/g, '');
                                            console.log("amount bet ==>" + amt);
                                            // since no further messages are queued after this,
                                            // the conversation will end naturally with status == 'completed'
                                            convo.next();
                                        }
                                    }, {
                                        pattern: 'no',
                                        callback: function (response, convo) {
                                            // stop the conversation. this will cause it to end with status == 'stopped'
                                            convo.repeat();
                                            convo.next();
                                        }
                                    }, {
                                        default: true,
                                        callback: function (response, convo) {
                                            convo.repeat();
                                            convo.next();
                                        }
                                    }]);
                                    convo.next();
                                }); // store the results in a field called nickname

                                convo.on('end', function (convo) {
                                    if (convo.status == 'completed') {
                                        controller.storage.users.get(message.user, function (err, user) {
                                            if (!user) {
                                                user = {
                                                    id: message.user,
                                                };
                                            }
                                            message.money -= 100;
                                            controller.storage.users.save(user, function (err, id) {
                                                client.bet(user.playerId, 100, function (response) {
                                                    if (response.success === true) {
                                                        displayHands(response, message, bot, user.playerId, _);
                                                        bot.reply(message,
                                                            {
                                                                attachment: {
                                                                    type: "template",
                                                                    payload: {
                                                                        template_type: "generic",
                                                                        elements: [
                                                                            {
                                                                                title: "Do you want to hit or Stand",
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
                                                                                    , {
                                                                                        type: "postback",
                                                                                        title: "Insurance",
                                                                                        payload: "insure"
                                                                                    }
                                                                                ]
                                                                            }
                                                                        ]
                                                                    }
                                                                }
                                                            });
                                                    } else {
                                                        console.log(response);
                                                        bot.reply(message, "Please type play to join a table");
                                                    }
                                                });
                                            });
                                        });
                                    }
                                });
                            }
                        });

                    }
                });

            });
            break
        case '6':
            //call function to perform stand operation
            controller.storage.users.get(message.user, function (err, user) {
                if (!user) {
                    user = {
                        id: message.user,
                    };
                }
                console.log(playerId);
                client.joinTable(user.playerId, 6, function (response) {
                    if (response.player.busted == false) {
                        bot.reply(message, "You are  on Table 6 with id" + playerId)
                        bot.reply(message, "You have credit of " + response.player.credits + "$")
                        bot.startConversation(message, function (err, convo) {
                            if (!err) {
                                convo.ask('How much do want to bet?', function (response, convo) {
                                    convo.ask('You want me to call you ' + response.text + '? (yes/no)', [{
                                        pattern: 'yes',
                                        callback: function (response, convo) {
                                            console.log(response.text);
                                            var text = response.text;
                                            var amt = text.replace(/\D+/g, '');
                                            console.log("amount bet ==>" + amt);
                                            // since no further messages are queued after this,
                                            // the conversation will end naturally with status == 'completed'
                                            convo.next();
                                        }
                                    }, {
                                        pattern: 'no',
                                        callback: function (response, convo) {
                                            // stop the conversation. this will cause it to end with status == 'stopped'
                                            convo.repeat();
                                            convo.next();
                                        }
                                    }, {
                                        default: true,
                                        callback: function (response, convo) {
                                            convo.repeat();
                                            convo.next();
                                        }
                                    }]);
                                    convo.next();
                                }); // store the results in a field called nickname

                                convo.on('end', function (convo) {
                                    if (convo.status == 'completed') {
                                        controller.storage.users.get(message.user, function (err, user) {
                                            if (!user) {
                                                user = {
                                                    id: message.user,
                                                };
                                            }
                                            message.money -= 100;
                                            controller.storage.users.save(user, function (err, id) {
                                                client.bet(user.playerId, 100, function (response) {
                                                    if (response.success === true) {
                                                        displayHands(response, message, bot, user.playerId, _);
                                                        bot.reply(message,
                                                            {
                                                                attachment: {
                                                                    type: "template",
                                                                    payload: {
                                                                        template_type: "generic",
                                                                        elements: [
                                                                            {
                                                                                title: "Do you want to hit or Stand",
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
                                                                                    , {
                                                                                        type: "postback",
                                                                                        title: "Insurance",
                                                                                        payload: "insure"
                                                                                    }
                                                                                ]
                                                                            }
                                                                        ]
                                                                    }
                                                                }
                                                            });
                                                    } else {
                                                        console.log(response);
                                                        bot.reply(message, "Please type play to join a table");
                                                    }
                                                });
                                            });
                                        });
                                    }
                                });
                            }
                        });
                    }
                });

            });
            break
    }
});
//
//controller.hears(['bet', []], 'message_received', function (bot, message) {
//    // do something to respond to message
//    var text = message.text;
//    var amt = text.replace(/\D+/g, '');
//    console.log(amt)
//    bot.reply(message, 'your money has been received');
//    controller.storage.users.get(message.user, function (err, user) {
//        if (!user) {
//            user = {
//                id: message.user,
//            };
//        }
//        console.log("player id ===>" + user.playerId);
//        bot.reply(message, "betting");
//        //if (!is.null(amt)) {
//        client.bet(user.playerId, 100, function (response) {
//            if (response.success === true) {
//                displayHands(response, message, bot, user.playerId, _);
//                bot.reply(message,
//                    {
//                        attachment: {
//                            type: "template",
//                            payload: {
//                                template_type: "generic",
//                                elements: [
//                                    {
//                                        title: "Do you want to hit or Stand",
//                                        buttons: [
//                                            {
//                                                type: "postback",
//                                                title: "HIT",
//                                                payload: "hit"
//                                            },
//                                            {
//                                                type: "postback",
//                                                title: "STAND",
//                                                payload: "stand"
//                                            }
//                                            , {
//                                                type: "postback",
//                                                title: "Insurance",
//                                                payload: "insure"
//                                            }
//                                        ]
//                                    }
//                                ]
//                            }
//                        }
//                    });
//            } else {
//                console.log(response);
//                bot.reply(message, "Please type play to join a table");
//            }
//        });
//        //}
//    });
//});

//
//controller.on('message_received', function (bot, message) {
//    var text = message.text;
//    console.log("incoming" + text);
//    //var cmd = "bet";
//    var cmd;
//    is
//    if (is.nullOrUndefined(message.text)) {
//        cmd = "no cmd";
//    } else {
//        cmd = "bet";
//    }
//    //one material
//    //proper shirts
//    //
//
//    console.log("cmd" + cmd);
//    //var args = message.text.substr(1 + cmd.length).split(" ");
//    switch (cmd) {
//        case
//        "bet"
//        :
//            bot.reply(message, 'your money has been received');
//            controller.storage.users.get(message.user, function (err, user) {
//                if (!user) {
//                    user = {
//                        id: message.user,
//                    };
//                }
//                console.log("player id ===>" + user.playerId);
//                bot.reply(message, "betting");
//                client.bet(user.playerId, 100, function (response) {
//                    if (response.success === true) {
//                        displayHands(response, message, bot, user.playerId, _);
//                        bot.reply(message,
//                            {
//                                attachment: {
//                                    type: "template",
//                                    payload: {
//                                        template_type: "generic",
//                                        elements: [
//                                            {
//                                                title: "Do you want to hit or Stand",
//                                                buttons: [
//                                                    {
//                                                        type: "postback",
//                                                        title: "HIT",
//                                                        payload: "hit"
//                                                    },
//                                                    {
//                                                        type: "postback",
//                                                        title: "STAND",
//                                                        payload: "stand"
//                                                    }
//                                                    , {
//                                                        type: "postback",
//                                                        title: "Insurance",
//                                                        payload: "insure"
//                                                    }
//                                                ]
//                                            }
//                                        ]
//                                    }
//                                }
//                            });
//                    } else {
//                        console.log(response);
//                        bot.reply(message, "Please type play to join a table");
//                    }
//                });
//
//            });
//            break;
//        default:
//            //channel.sendMessage('Unknown command');
//            break;
//    }
//});