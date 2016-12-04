var _ = require('lodash');

var Scrutin = require('../lib/scrutin');

var resultsBoards = {};
var scrutinsPerVoteMode = {};
var mkResPerscrutin = {};


exports.update = function(voteMode,ballots){
  scrutinsPerVoteMode[voteMode].forEach(function(scrutin){    
    resultsBoards[scrutin] = mkResPerscrutin[scrutin](ballots);
  });

}

exports.get = function(scrutin){
  return _.cloneDeep(resultsBoards[scrutin]);
}

exports.init = function(scrutins,ballotsPerMode){

  for(label in scrutins){
    if(scrutinsPerVoteMode[scrutins[label].voteMode])
      scrutinsPerVoteMode[scrutins[label].voteMode].push(label);
    else
      scrutinsPerVoteMode[scrutins[label].voteMode] = [label];
    
    mkResPerscrutin[label] = Scrutin[scrutins[label].mkRes];
  }

  for(voteMode in ballotsPerMode){
    //si un mode de vote n'a pas de scrutin
    if(!scrutinsPerVoteMode[voteMode])
      scrutinsPerVoteMode[voteMode]= [];
    
    this.update(voteMode,ballotsPerMode[voteMode]);
  }
  
};
