// const SpaceXAPI = require('SpaceX-API-Wrapper');
// const restify = require('restify');
// const server = restify.createServer()
// let SpaceX = new SpaceXAPI();
// server.listen("3333", function () {
//   console.warn('server started in port : 3333')
// })
// SpaceX.getCompanyInfo(function(err, info){
//     console.log(info);
// }); 
//On récupère les constantes de notre fichier .env
require('dotenv').config();
const botBuilder = require('botbuilder');
const SpaceXAPI = require('SpaceX-API-Wrapper');
const restify = require('restify');
let SpaceX = new SpaceXAPI();
// var fetch = require("node-fetch");
SpaceX.getLatestLaunch(function(err, info){
  console.log(info);

});
// fetch(`http://127.0.0.1:8000/band/api/1/?format=json`)
// .then(result=> {
//   console.log(result.name)
// })
// SpaceX.getCompanyInfo(function(err, info){
//   console.log(info);
// });

//On crée le serveur
const server = restify.createServer()

//On dit à notre serveur d'ecouter le port souhaité, process est une variable super globale qui stock plein d'informations sur les events et threads
server.listen(process.env.PORT, function () {
  console.warn('server started in port : ' + process.env.PORT)
})

//On crée une connexion au chat, on lui passe des identifiants de connexion mais ils ne sont pas obligatoire
//Version avec identifiants
// const connector = new botBuilder.ChatConnector({
//   appId = process.env.MICROSOFT_APP_ID,
//   appPassword = process.env.MICROSOFT_APP_PASSWORD
// })
//Version sans identifiant
const connector = new botBuilder.ChatConnector()
server.post('/api/messages', connector.listen())

//MemoryBotStorage permet de stocker les datas sur la mémoire vive de l'ordinateur
const inMemoryStorage = new botBuilder.MemoryBotStorage();

//Notre Bot
const bot = new botBuilder.UniversalBot(connector, [
  //On demarre le dialog nommé menu
  function (session) {
    session.beginDialog('menu', session.userData.profile)
  },
  function (session, result) {
    session.userData.profile = result.response;
  }
]).set('storage', inMemoryStorage);


//Notre dialog qui s'appelle greetings
bot.dialog('greetings', [

  //Type choice
  function (session, args, next) {
    session.dialogData.profile = args || {};
    //Sans option
    // if(!session.dialogData.profile.name) botBuilder.Prompts.choice(session, 'Quelle est ta couleur préférée ?', ['Bleu', 'Blanc', "Vert"])
    
    //Avec option
    if(!session.dialogData.profile.name) botBuilder.Prompts.choice(session, 'Quelle est ta couleur préférée ?', ['Bleu', 'Blanc', "Vert"], { listStyle: 3 })
    //Next permet de sauter une etape, exemple si on a deja le prenom du user
    else next();
  },
  //Type texte
  // function (session, args, next) {
  //   session.dialogData.profile = args || {};
  //   if(!session.dialogData.profile.name) botBuilder.Prompts.text(session, 'What is your name ?')
  //   else next();
  // },
  function (session, result) {
    session.endDialogWithResult(result)
  }
])

//Object contenant les parametres de notre prompt choice
const menuItems = {
  'A propos de SpaceX' : { item : 'apropos' },
  'Dernier lancement' : { item : 'option1' },
  'Prochain lancement' : { item : 'option1' },
  'Anciens lancements' : { item : 'option1' },
  'Lancement(s) à venir' : { item : 'option1' },
  'Tous les lancements' : { item : 'option1' }
}

bot.dialog('apropos', function(session) {
  SpaceX.getCompanyInfo(function(err, info){
    let history = info.name+" a été créé en "+info.founded+" par "+info.founder+", l'entreprise compte à ce jour "+info.employees
    history += ". Elle possède "+info.vehicles+" véhicules, "+info.launch_sites+" sites de lancements et "+info.test_sites+" site de test"
    session.send(history);
  });
});

bot.dialog('latest', function(session) {
  SpaceX.getLatestLaunch(function(err, info){
    let latest = "Numéro de vol : "+info.flight_number
    latest += "Nom de la mission : "+info.mission_name
    
    console.log(info);
      const adaptiveCard = buildLaunchAdaptiveCard()


      new botBuilder.Message(session)
  
  });
});

//Exemple de dialog avec les paramètres via un tableau
bot.dialog('menu', [
  //Step 1, on choisit une option
  function(session) {
    botBuilder.Prompts.choice(session, "Sélectionner une option", menuItems, { listStyle: 3 });
  },
  //Step 2, on récupère le choix et on redirige vers le dialogue selectionné
  function(session, result) {
    const choice = result.response.entity;
    session.beginDialog(menuItems[choice].item);
    // botBuilder.Prompt.choice(session, "Choose an option from the list bellow", menuItems, { listStyle: 3 });
  }
])