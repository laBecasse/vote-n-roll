/* vote.js */
/* controlleur pour les votes */

var express = require('express'),
    _       = require('lodash');
var router  = express.Router();
var fs      = require('fs');
var path    = require('path');
var escapeHTML = require('escape-html');

var Election = require('../models/elections');
var Candidats = require('../models/candidats.js'),
    Config    = require('../config.js'),
    voteMode  = _.cloneDeep(Config.voteModes),
    voteParser = require('../lib/postParser.js');
VoteBox   = require('../models/voteBox');
var resultsBoard = require('../models/resultsBoard')

/* Brute force prevent*/


var ExpressBrute = require('express-brute'),
    store;

store = new ExpressBrute.MemoryStore();

var blockCallback = function (req, res, next, nextValidRequestDate) {
    
    var electionId = req.params.electionId;
    var E = Election.get(electionId);
    
    if(typeof E == 'undefined'){
	res.status(404);
	res.send('404: Page not Found');
	return;
    }else{
	
	var message = "Vous avez voté un nombre important de fois, veuillez réesayer plus tard";
	res.redirect('/vote/'+electionId+'?error='+message+'&to=pref');
    }
};

var handleStoreError =  function (error) {
    throw {
	message: error.message,
	parent: error.parent
    };
}

var bruteForce = new ExpressBrute(store,{
    freeRetries: 5,
    attachResetToRequest: false,
    refreshTimeoutOnRequest: false,
    minWait: 3*60*1000, // 3 minutes
    maxWait: 24*60*60*1000, // 1 day,
    failCallback: blockCallback,
    handleStoreError: handleStoreError
    
});

router.use(function(req,res,next){
    res.locals.pageName = "vote";
    next();
})

/* GET formulaire de vote */
router.get('/:electionId', function(req, res, next) {

    var electionId = req.params.electionId; 
    var E = Election.get(electionId);

    if(typeof E == 'undefined'){
	res.status(404);
	res.send('404: Page not Found');
	return;
    }

    var candLabel = E.Candidats.labels,
	nameLab   = _.map(candLabel,
                          function(label){
                              return { "label" : label,
                                       "name"  : E.Candidats[label].name,
                                       "image" : E.Candidats[label].image
                                     };
                          });

    var message,
	messageType,
	messageTo;

    //on récupère le message ou l'erreur
    if(req.query.message && req.query.to){
	message = escapeHTML(req.query.message);
	messageType = "info";
	messageTo = escapeHTML(req.query.to);
    }
    if(req.query.error){
	message = escapeHTML(req.query.error);
	messageType = "error";
	messageTo = escapeHTML(req.query.to);
    }

    //liste des bulletins que l'on veut recueillir avec leurs paramètres
    var ballotsList = _.map(voteMode,(config) => config)
    var elections = Election.getAll();
    
    res.render('vote',{
	"title"   : 'Votes pour ' + E.name,
	"electionId" : electionId,
	"elections" : elections,
	"nameLab" : _.shuffle(nameLab),
	"message" : message,
	"messageType": messageType,
	"messageTo" : messageTo,
	"ballotsList": ballotsList
    });
});

router.post('/ajout/:electionId',bruteForce.prevent, function(req, res, next){

    var electionId = req.params.electionId;
    var E = Election.get(electionId);
    
    if(typeof E == 'undefined'){
	res.status(404);
	res.send('404: Page not Found');
	return;
    }

    var candLabel = E.Candidats.labels;
    var params    = req.body;
    var savedNb   = 0;
    var voteModeNB = E.voteModes.length; 


    // get specific data of the vote mode from the post data
    var datas = _.map(voteMode, (m,modelLabel)=> voteParser[m.postParser](params,candLabel));

    var vmLabels = Object.keys(voteMode);
    
    VoteBox.addTo(E.id,vmLabels,datas,candLabel,function(err,mlError){
	if(err){
	    if(err =="invalid"){
		var message = encodeURIComponent("Vote invalide, pensez à remplir tout le formulaire");
		res.redirect('/vote/'+electionId+'?error='+message+'&to='+mlError+'#'+mlError);
	    }else
		return next(err);
	}else{
	    _.forEach(voteMode,function(m,modelLabel){
		//mise à jour des résultats
		VoteBox.getFrom(E.id,modelLabel,function(err,ballots){
		    //save csv of results
		    var ws = fs.createWriteStream(__dirname+"/../public/data/votes-"+electionId+"-"+modelLabel+".csv");
		    require('../lib/toCSV')[m.toCSV](ballots,ws);
		})
		
	    })

	    var message = encodeURIComponent("Vos votes ont été pris en compte. Vous pouvez à présent consulter les résultats.");
	    res.redirect('/resultats/'+electionId+'?message='+message);
	}
	
    })
})

router.get('/json/:electionId',function(req,res,next){
    
    var electionId = req.params.electionId;
    var E = Election.get(electionId);

    if(typeof E == 'undefined'){
	res.status(404);
	res.send('404: Page not Found');
	return;
    }
    
    res.setHeader('Content-Type', 'application/json');

    var allBallots = {};
    var voteModes = E.voteModes

    grapBallot(0);

      function grapBallot(i){
	VoteBox.getFrom(E.id,voteModes[i],function(err,ballots){
	    if(err) return next(err);

	  var toJSON = require('../lib/toJSON');

	  allBallots[voteModes[i]] = toJSON[voteModes[i]+"JSON"](ballots);
	    
	    i++;
	    if(voteModes.length == i)
		return send();
	    else
		return grapBallot(i);
	    
	}); 
    }


    function send(){
      res.send(allBallots);
    }
    
})

module.exports = router;
