//import { ListStyle } from 'botbuilder';

require('dotenv').config();
var builder = require('botbuilder');
var restify = require('restify');

// var spacexClient = require('./Services/spacex')
// let spacex = new spacexClient();
const SpaceXAPI = require('SpaceX-API-Wrapper');
let SpaceX = new SpaceXAPI();

const port = 3333

const server = restify.createServer()
server.listen(port, function () {
  console.warn('server started in port : ' + port)
})

const connector = new builder.ChatConnector()
server.post('/api/messages', connector.listen())

// var connector = new builder.ChatConnector({
//     appId: process.env.MICROSOFT_APP_ID,
//     appPassword: process.env.MICROSOFT_APP_PASSWORD
// });

var inMemoryStorage = new builder.MemoryBotStorage();
var bot = new builder.UniversalBot(connector, [
    function (session) {
        //Lancement du premier dialogue 'greetings'
        session.send(`Hello, je suis le chatbot spaceX :)`);
        session.beginDialog('menu', session.userData.profile);
    }
]).set('storage', inMemoryStorage);

bot.on('conversationUpdate', function (message) {
    if (message.membersAdded) {
        message.membersAdded.forEach(function (identity) {
            if (identity.id === message.address.bot.id) {
                bot.beginDialog(message.address, '/');
            }
        });
    }
});

const menuItems = {
    'A propos de SpaceX' : { item : 'apropos' },
    'Dernier lancement' : { item : 'latest' },
    'Anciens lancements' : { item : 'pastlaunches' },
    'Lancement(s) à venir' : { item : 'upcoming' },
    'Tous les lancements' : { item : 'all' }
}


bot.dialog('menu', [
    //step 1    
    function (session) {
        builder.Prompts.choice(session,
            "Voilà ce que je peux faire pour toi",
            menuItems,
            { listStyle: 3 }
        );
    },
    //step 2
    function (session, results) {
        var choice = results.response.entity;
        session.beginDialog(menuItems[choice].item);
    }
])

bot.dialog('apropos', function(session) {
  SpaceX.getCompanyInfo(function(err, info){
    let history = info.name+" a été créé en "+info.founded+" par "+info.founder+", l'entreprise compte à ce jour "+info.employees+" employés"
    history += ". Elle possède "+info.vehicles+" véhicules, "+info.launch_sites+" sites de lancements et "+info.test_sites+" site de test"
    session.send(history);
  });
});

bot.dialog('getCompanyInfo', [
    function (session) {
        session.sendTyping();
        SpaceX.getCompanyInfo(function (err, info) {
            session.send(JSON.stringify(info));
        });
    },
]);

bot.dialog('pastlaunches', [
  function (session) {
    session.sendTyping();
    SpaceX.getAllPastLaunches(null, function(err, info){
      const launches = []
      for(let launch in info) {
        launches.push(buildLaunchHeroCard(info[launch], session));
      }

      var msg = new builder.Message(session);
      msg.attachmentLayout(builder.AttachmentLayout.carousel)
      msg.attachments(launches);
      session.send(msg).endDialog();
    });
  }
]);

bot.dialog('upcoming', [
  function (session) {
    session.sendTyping();
    SpaceX.getAllUpcomingLaunches(null, function(err, info){
      const launches = []
      for(let launch in info) {
        launches.push(buildLaunchHeroCard(info[launch], session));
      }

      var msg = new builder.Message(session);
      msg.attachmentLayout(builder.AttachmentLayout.carousel)
      msg.attachments(launches);
      session.send(msg).endDialog();
    });
  }
]);

bot.dialog('all', [
  function (session) {
    session.sendTyping();
    SpaceX.getAllLaunches(null, function(err, info){
      const launches = []
      for(let launch in info) {
        launches.push(buildLaunchHeroCard(info[launch], session));
      }

      var msg = new builder.Message(session);
      msg.attachmentLayout(builder.AttachmentLayout.carousel)
      msg.attachments(launches);
      session.send(msg).endDialog();
    });
  }
]);

bot.dialog('latest', [
    function (session) {
        session.sendTyping();
        SpaceX.getLatestLaunch(function (err, launch) {
            var adaptiveCardMessage = buildLaunchAdaptiveCard(launch, session);
            session.send(adaptiveCardMessage);
        });
    },
]);

bot.dialog('successufulLaunches', [
    function (session) {
        session.sendTyping();
        SpaceX.getAllLaunches({ launch_success: true }, function (err, launches) {
            session.send(JSON.stringify(launches));
        });
    },
]);

function buildLaunchAdaptiveCard(launch, session) {
    var adaptiveCardMessage = new builder.Message(session)
        .addAttachment({
            contentType: "application/vnd.microsoft.card.adaptive",
            content: {
                type: "AdaptiveCard",
                body: [
                    {
                        "type": "Container",
                        "items": [
                            {
                                "type": "TextBlock",
                                "text": launch.mission_name+" - flight n°"+launch.flight_number,
                                "weight": "bolder",
                                "size": "medium"
                            },
                            {
                                "type": "ColumnSet",
                                "columns": [
                                    {
                                        "type": "Column",
                                        "width": "auto",
                                        "items": [
                                            {
                                                "type": "Image",
                                                "url": launch.links.mission_patch_small,
                                                "size": "small",
                                                "style": "person"
                                            }
                                        ]
                                    },
                                    {
                                        "type": "Column",
                                        "width": "stretch",
                                        "items": [
                                            {
                                                "type": "TextBlock",
                                                "text": launch.rocket.rocket_name,
                                                "weight": "bolder",
                                                "wrap": true
                                            },
                                            {
                                                "type": "TextBlock",
                                                "spacing": "none",
                                                "text": "Launched the "+launch.launch_year,
                                                "isSubtle": true,
                                                "wrap": true
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "type": "Container",
                        "items": [
                            {
                                "type": "TextBlock",
                                "text": "Launch informations",
                                "size": "medium",
                                "weight": "bolder",
                                "wrap": true
                            },
                            {
                                "type": "FactSet",
                                "facts": [
                                    {
                                        "title": "Success:",
                                        "value": (launch.launch_success ? "Yes" : "No")
                                    },
                                    {
                                        "title": "Site:",
                                        "value": launch.launch_site.site_name_long
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        "type": "Container",
                        "items": [
                            {
                                "type": "TextBlock",
                                "text": "Reusable elements",
                                "weight": "bolder",
                                "size": "medium",
                                "wrap": true
                            },
                            {
                                "type": "FactSet",
                                "facts": [
                                    {
                                        "title": "Core:",
                                        "value": (launch.reuse.core ? "Yes" : "No")
                                    },
                                    {
                                        "title": "Side core n°1:",
                                        "value": (launch.reuse.side_core1 ? "Yes" : "No")
                                    },
                                    {
                                        "title": "Side core n°2:",
                                        "value": (launch.reuse.side_core2 ? "Yes" : "No")
                                    },
                                    {
                                        "title": "Capsule:",
                                        "value": (launch.reuse.capsule ? "Yes" : "No")
                                    },
                                ]
                            }
                        ]
                    },
                    {
                        "type": "Container",
                        "items": [
                            {
                                "type": "TextBlock",
                                "text": launch.details,
                                "wrap": true
                            }                           
                        ]
                    }
                ],
                "actions": [
        
                    {
                        "type": "Action.OpenUrl",
                        "title": "See launch",
                        "url": launch.links.video_link
                    }
                    // ,
                    // {
                    //     "type": "Action.ShowCard",
                    //     "title": "Comment",
                    //     "card": {
                    //         "type": "AdaptiveCard",
                    //         "body": [
                    //             {
                    //                 "type": "Input.Text",
                    //                 "id": "comment",
                    //                 "isMultiline": true,
                    //                 "placeholder": "Enter your comment"
                    //             }
                    //         ],
                    //         "actions": [
                    //             {
                    //                 "type": "Action.Submit",
                    //                 "title": "OK"
                    //             }
                    //         ]
                    //     }
                    // }
                ]
            }
        });
        return adaptiveCardMessage;
}

function buildLaunchHeroCard(launch, session) {
  const herocard = new builder.HeroCard(session)
            .title(launch.mission_name+" - flight n°"+launch.flight_number,)
            .subtitle(launch.rocket.rocket_name)
            .text(launch.details)
            .images([builder.CardImage.create(session, launch.links.mission_patch)])
            .buttons([
              
                builder.CardAction.dialogAction(session, "apropos", launch, "More details")
                // builder.CardAction.imBack(session, "apropos", "More details")
            ])
  return herocard
}