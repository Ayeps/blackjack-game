/**
 * Created by Softmasters on 6/1/2016.
 */

var Botkit = require('botkit');
var client = require('./src/client');
var Cards = require('./src/cards');
var assert = require('assert');
var is = require('is2');
var _ = require('lodash');
var playerId = 0;
var tableid = 0;
var username;
var tableState;
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
            bot.reply(message, card.rank + " " + card.suit, " " + card.image);
        } else {
            assert.ok(false);
        }
    });
}

imagetemplate = function (response, message, bot, playerId) {

}

message = function (response, message, bot, playerId) {

}

displayHands = function (response, message, bot, playerId, _) {
    console.log(response.player + " is the player id");
    bot.reply(message, "inside display hands");
    var table = response.table;
    var player = response.player;
    assert.ok(is.nonEmptyObj(table));
    var dealerHand = table.dealer.hand;
    var yourHand;
    displayHand('Dealers hand:', dealerHand, message, bot, _);
    if (is.positiveInt(player.bet)) {
        yourHand = table.players[playerId].hand;
        displayHand('Your hand:', yourHand, message, bot, _);
    } else if (player.bet === -1 && is.obj(player.result)) {
        yourHand = player.result.players[playerId].hand;
        displayHand('Your hand:', yourHand, message, bot, yourHand, _);
        if (player.result.players[playerId].push) {
            //console.log('Push. You have %s credits.', player.credits);
            bot.reply(message, 'Push. You have %s credits.', player.credits)
        } else {
            //console.log('You %s %s and currently have %s credits.',
            //    (player.result.players[playerId].win ? 'won' : 'lost'),
            //    player.result.players[playerId].bet,
            //    player.credits);
            bot.reply(message, 'You %s %s and currently have %s credits.',
                (player.result.players[playerId].win ? 'won' : 'lost'),
                player.result.players[playerId].bet,
                player.credits)

        }
    }
}


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


controller.hears(['hello', 'hi', 'Play', 'start', 'lets play', 'can we start?', 'Hallo', 'Give me a card'], 'message_received', function (bot, message) {
    controller.storage.users.get(message.user, function (err, user) {
        if (user && user.name) {
            bot.reply(message, 'Hello ' + user.name + '!!');
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

controller.hears(['bet', '^pattern$'], ['message_received'], function (bot, message) {

    // do something to respond to message
    var text = message.text;
    var amt = text.replace(/\D+/g, '');

    //var amt = text.match(/\d+/g).join("");

    console.log(amt)
    bot.reply(message, 'your' + message.text + 'recieved!');

    controller.storage.users.get(message.user, function (err, user) {
        if (!user) {
            user = {
                id: message.user,
            };
        }
        console.log(user.playerId);
        if (user.playerId != 0) {
            playerId = user.playerId;
        }
        client.bet(playerId, 100, function (response) {
            console.log("player id " + response);
            if (response.success == true) {
                //var dealerHand = response.table.dealer.hand;
                //_.forEach(dealerHand, function (c) {
                //    if (is.str(c)) {
                //        //printf('    %s\n', c);
                //        bot.reply(message, c);
                //    } else if (is.int(c) && c > -1) {
                //        var card = Cards.getCard(c);
                //        //printf('%s of %s\n', card.rank, card.suit);
                //        console.log(card.image);
                //        bot.reply(message, "Dealer Card :" + card.rank + " " + card.suit, +" " + card.image);
                //        bot.reply(message, {
                //            attachment: {
                //                type: "template",
                //                payload: {
                //                    template_type: "generic",
                //                    elements: [
                //                        {
                //                            title: "Dealer card",
                //                            image_url: card.image,
                //                            subtitle: card.rank + " " + card.suit,
                //                        }]
                //                }
                //            }
                //        });
                //
                //    } else {
                //        assert.ok(false);
                //    }
                //});
                ////bot.reply(message, "Your Hand");
                //var yourHand = response.table.players[playerId].hand;
                //_.forEach(yourHand, function (c) {
                //    if (is.str(c)) {
                //        //printf('    %s\n', c);
                //        bot.reply(message, c);
                //    } else if (is.int(c) && c > -1) {
                //        var card = Cards.getCard(c);
                //        //printf('%s of %s\n', card.rank, card.suit);
                //        bot.reply(message, "Your card :" + card.rank + " " + card.suit);
                //        bot.reply(message, {
                //            attachment: {
                //                type: "template",
                //                payload: {
                //                    template_type: "generic",
                //                    elements: [
                //                        {
                //                            title: "Your card",
                //                            image_url: card.image,
                //                            subtitle: card.rank + " " + card.suit,
                //
                //                        }]
                //                }
                //            }
                //        });
                //
                //
                //    } else {
                //        assert.ok(false);
                //    }
                //});

                //displayHands();

                //assert.ok(response.player.bet === amt);
                //
                //tableid = response.player.tableId;
                //tableState = response.table.state;
                //assert.ok(is.obj(response.player));
                //assert.ok(is.array(response.player.hand));
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
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                );
            } else {
                bot.reply(message, "see" + response.success);
                bot.reply(message, "Please type play to join a table ");

            }

        });

    });


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
            controller.storage.users.get(message.user, function (err, user) {
                if (!user) {
                    user = {
                        id: message.user,
                    };
                }
                console.log(playerId);
                client.leaveTable(user.playerId, function (response) {

                })

            });
            bot.reply(message, "Thank for playing the game with us")
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
                    var table = response.table;
                    var player = response.player;
                    assert.ok(is.nonEmptyObj(table));
                    var dealerHand = table.dealer.hand;
                    var yourHand;
                    //displayHand('Dealers hand:', dealerHand);
                    _.forEach(dealerHand, function (c) {
                        if (is.str(c)) {
                            //printf('    %s\n', c);
                            bot.reply(message, c);
                        } else if (is.int(c) && c > -1) {
                            var card = Cards.getCard(c);
                            //printf('%s of %s\n', card.rank, card.suit);
                            bot.reply(message, "Dealer Card" + card.rank + " " + card.suit);
                        } else {
                            assert.ok(false);
                        }
                    });
                    if (is.positiveInt(player.bet)) {
                        //yourHand = table.players[playerId].hand;
                        //bot.reply(message, 'your hand')
                        yourHand = response.table.players[user.playerId].hand;
                        _.forEach(yourHand, function (c) {
                            if (is.str(c)) {
                                //printf('    %s\n', c);
                                bot.reply(message, c);
                            } else if (is.int(c) && c > -1) {
                                var card = Cards.getCard(c);
                                //printf('%s of %s\n', card.rank, card.suit);
                                bot.reply(message, "Your hand" + card.rank + " " + card.suit);
                            } else {
                                assert.ok(false);
                            }
                        });
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
                    } else if (player.bet === -1 && is.obj(player.result)) {
                        //displayHand('Your hand:', yourHand);
                        //bot.reply(message, 'your hand')
                        yourHand = response.table.players[user.playerId].hand;
                        _.forEach(yourHand, function (c) {
                            if (is.str(c)) {
                                //printf('    %s\n', c);
                                bot.reply(message, c);
                            } else if (is.int(c) && c > -1) {
                                var card = Cards.getCard(c);
                                //printf('%s of %s\n', card.rank, card.suit);
                                bot.reply(message, "Your hand" + card.rank + " " + card.suit);
                            } else {
                                assert.ok(false);
                            }
                        });
                        bot.reply(message,
                            {
                                attachment: {
                                    type: "template",
                                    payload: {
                                        template_type: "generic",
                                        elements: [
                                            {
                                                title: "Would you like to play a again?",
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
                        if (player.result.players[user.playerId].push) {
                            //console.log('Push. You have %s credits.', player.credits);
                            bot.reply(message, 'Push. You have ' + player.credits + ' credits.')

                        } else {

                            //console.log('You %s %s and currently have %s credits.',
                            //    (player.result.players[playerId].win ? 'won' : 'lost'),
                            //    player.result.players[playerId].bet,
                            //    player.credits);
                            bot.reply(message, 'You ' + (player.result.players[user.playerId].win ? 'won' : 'lost') + '' +
                                ' ' + player.result.players[user.playerId].bet + 'and currently have ' + player.credits + 'credits.'
                            )
                        }
                    }
                })
            });


            break
        case 'stand':
            //call function to perform stand operation

            controller.storage.users.get(message.user, function (err, user) {
                if (!user) {
                    user = {
                        id: message.user,
                    };
                }
                client.stand(user.playerId, function (response) {

                    var table = response.table;
                    var player = response.player;
                    assert.ok(is.nonEmptyObj(table));
                    var dealerHand = table.dealer.hand;
                    var yourHand;
                    //displayHand('Dealers hand:', dealerHand);
                    //bot.reply(message, 'delers hand')
                    _.forEach(dealerHand, function (c) {
                        if (is.str(c)) {
                            //printf('    %s\n', c);
                            bot.reply(message, c);
                        } else if (is.int(c) && c > -1) {
                            var card = Cards.getCard(c);
                            //printf('%s of %s\n', card.rank, card.suit);
                            bot.reply(message, "Dealer Hand" + card.rank + " " + card.suit);
                        } else {
                            assert.ok(false);
                        }
                    });
                    if (is.positiveInt(player.bet)) {
                        //yourHand = table.players[playerId].hand;
                        bot.reply(message, 'your hand')
                        yourHand = response.table.players[user.playerId].hand;
                        _.forEach(yourHand, function (c) {
                            if (is.str(c)) {
                                //printf('    %s\n', c);
                                bot.reply(message, c);
                            } else if (is.int(c) && c > -1) {
                                var card = Cards.getCard(c);
                                //printf('%s of %s\n', card.rank, card.suit);
                                bot.reply(message, "your hand" + card.rank + " " + card.suit);
                            } else {
                                assert.ok(false);
                            }
                        });
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
                    } else if (player.bet === -1 && is.obj(player.result)) {
                        //displayHand('Your hand:', yourHand);
                        //bot.reply(message, 'your hand : result' + player.result)
                        yourHand = response.table.players[user.playerId].hand;
                        _.forEach(yourHand, function (c) {
                            if (is.str(c)) {
                                //printf('    %s\n', c);
                                bot.reply(message, c);
                            } else if (is.int(c) && c > -1) {
                                var card = Cards.getCard(c);
                                //printf('%s of %s\n', card.rank, card.suit);
                                bot.reply(message, 'Your card :' + card.rank + " " + card.suit);

                            } else {
                                assert.ok(false);
                            }

                        });
                        bot.reply(message,
                            {
                                attachment: {
                                    type: "template",
                                    payload: {
                                        template_type: "generic",
                                        elements: [
                                            {
                                                title: "Would you like to play a again?",
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
                        if (player.result.players[user.playerId].push) {
                            bot.reply(message, 'Push. You have ' + player.credits + ' credits.')
                        } else {
                            bot.reply(message, 'You ' + (player.result.players[user.playerId].win ? 'won' : 'lost') + '' +
                                ' ' + player.result.players[user.playerId].bet + 'and currently have ' + player.credits + 'credits.'
                            )
                        }
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
                console.log(playerId);
                client.joinTable(user.playerId, 1, function (response) {
                    if (response.player.busted == false) {
                        bot.reply(message, "You are  on Table 1 with id" + playerId)
                        bot.reply(message, "You have credit of " + response.player.credits + " $")
                        bot.reply(message, "How much do you want to bet (eg. bet amount $)")
                        bot.reply(message, "example (eg. bet amount $)")
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
                client.joinTable(user.playerId, 2, function (response) {
                    if (response.player.busted == false) {
                        bot.reply(message, "You are on Table 2")
                        bot.reply(message, "You have credit of " + response.player.credits + " $")
                        bot.reply(message, "How much do you want to bet (bet amount $)")
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
                client.joinTable(user.playerId, 3, function (response) {
                    if (response.player.busted == false) {
                        bot.reply(message, "You are on Table 3 ")
                        bot.reply(message, "You have credit of " + response.player.credits + " $")
                        bot.reply(message, "How much do you want to bet (bet amount $)")
                    }
                })

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
                        bot.reply(message, "You are on Table 5 ")
                        bot.reply(message, "You have credit of " + response.player.credits + " $")


                        bot.reply(message, "How much do you want to bet (bet amount $)")
                    }
                })

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
                        bot.reply(message, "You are on Table 5 ")
                        bot.reply(message, "You have credit of " + response.player.credits + " $")
                        bot.reply(message, "How much do you want to bet (bet amount $)")
                    }
                })

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
                        bot.reply(message, "You are on Table 6 ")
                        bot.reply(message, "You have credit of " + response.player.credits + " $")
                        bot.reply(message, "How much do you want to bet (bet amount $)")
                    }
                })

            });
            break
    }
})


controller.hears(['(.*)(get|want|order|would like)(.*)pizza(.*)'], 'message_received', function (bot, message) {
    controller.storage.users.get(message.user, function (err, user) {
        if (1 == 0) {
            bot.reply(message, 'What kind of pizza would you like ' + user.name);
        } else {
            bot.startConversation(message, function (err, convo) {
                if (user && user.name) {
                    convo.say('!');
                    convo.ask('What kind of pizza would you like?', function (response, convo) {
                        convo.ask('You want me to buy you ' + response.text + '?', [{
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
                        'key': 'choice'
                    }); // store the results in a field called choice

                    convo.on('end', function (convo) {
                        if (convo.status == 'completed') {
                            bot.reply(message, 'OK! I will get you that pizza...');

                            controller.storage.users.get(message.user, function (err, user) {
                                if (!user) {
                                    user = {
                                        id: message.user,
                                    };
                                }
                                user.pizzaType = convo.extractResponse('choice');
                                controller.storage.users.save(user, function (err, id) {
                                    bot.reply(message, 'Here is the options for ' + user.pizzaType + ' you selected.');
                                });

                                if (user.pizzaType.toLowerCase().indexOf('pepperoni') > -1) { //(.*)(pepperoni)(.*)pizza(.*)
                                    bot.reply(message, {
                                        attachment: {
                                            'type': 'template',
                                            'payload': {
                                                'template_type': 'generic',
                                                'elements': [{
                                                    'title': 'Classic pepperoni pizza',
                                                    'image_url': 'https://cache.dominos.com/olo/3_16_1/assets/build/market/US/_en/images/img/products/thumbnails/S_PIZZA.jpg',
                                                    'subtitle': 'Dominos Online Ordering',
                                                    'buttons': [{
                                                        'type': 'web_url',
                                                        'url': 'https://www.dominos.com/en/pages/order/menu.jsp#/menu/category/all/',
                                                        'title': 'Place order'
                                                    }, {
                                                        'type': 'web_url',
                                                        'url': 'https://www.dominos.com/en/pages/order/menu.jsp#/menu/category/all/',
                                                        'title': 'Buy Item'
                                                    }, {
                                                        'type': 'postback',
                                                        'title': 'Bookmark Item',
                                                        'payload': 'Pepperoni Pizza'
                                                    }]
                                                }, {
                                                    'title': 'PEPPERONI LOVERs',
                                                    'image_url': 'https://www.pizzahut.com/assets/w/tile/thor/Pepperoni_Lovers_Pizza.png',
                                                    'subtitle': 'Classic marinara sauce piled high with cheese and over 50% more authentic, old-world pepperoni hand-placed on your pizza',
                                                    'buttons': [{
                                                        'type': 'web_url',
                                                        'url': 'https://order.pizzahut.com/site/menu/pizza',
                                                        'title': 'View Item'
                                                    }, {
                                                        'type': 'web_url',
                                                        'url': 'https://order.pizzahut.com/site/menu/pizza',
                                                        'title': 'Buy Item'
                                                    }, {
                                                        'type': 'postback',
                                                        'title': 'Bookmark Item',
                                                        'payload': 'PEPPERONI'
                                                    }]
                                                }]
                                            }
                                        }
                                    });
                                } else if (user.pizzaType.toLowerCase().indexOf('cheese') > -1) {

                                    bot.reply(message, {
                                        attachment: {
                                            'type': 'template',
                                            'payload': {
                                                'template_type': 'generic',
                                                'elements': [{
                                                    'title': 'Classic cheese pizza',
                                                    'image_url': 'https://cdn.nexternal.com/cincyfav3/images/larosas_cheese_pizzas1.jpg',
                                                    'subtitle': 'Dominos Online Ordering',
                                                    'buttons': [{
                                                        'type': 'web_url',
                                                        'url': 'https://www.dominos.com/en/pages/order/menu.jsp#/menu/category/all/',
                                                        'title': 'Place order'
                                                    }, {
                                                        'type': 'web_url',
                                                        'url': 'https://www.dominos.com/en/pages/order/menu.jsp#/menu/category/all/',
                                                        'title': 'Buy Item'
                                                    }, {
                                                        'type': 'postback',
                                                        'title': 'Bookmark Item',
                                                        'payload': 'Pepperoni Pizza'
                                                    }]
                                                }, {
                                                    'title': 'Cheese Pizza',
                                                    'image_url': 'http://cdn.schwans.com/media/images/products/56719-1-1540.jpg',
                                                    'subtitle': 'Classic cheese piled high with cheese',
                                                    'buttons': [{
                                                        'type': 'web_url',
                                                        'url': 'https://order.pizzahut.com/site/menu/pizza',
                                                        'title': 'View Item'
                                                    }, {
                                                        'type': 'web_url',
                                                        'url': 'https://order.pizzahut.com/site/menu/pizza',
                                                        'title': 'Buy Item'
                                                    }, {
                                                        'type': 'postback',
                                                        'title': 'Bookmark Item',
                                                        'payload': 'Cheese Pizza'
                                                    }]
                                                }]
                                            }
                                        }
                                    });
                                }

                            });
                        } else {
                            // this happens if the conversation ended prematurely for some reason
                            bot.reply(message, 'OK, nevermind!');

                            convo.next();
                        }
                    });
                }
            });
        }
    });
});


controller.on(['(.*)'], 'message_received', function (bot, message) {
    bot.reply(message, 'My name is Pipper');
    return false;
});
//controller.on(['draw'], 'message_received', function (bot, message) {
//    bot.reply(message, "I don't understand that yet, Please try Hello and follow the intructions thank you.");
//    bot.reply(message, "I can also help you order pizza");
//    return false;
//});


//return hand;
