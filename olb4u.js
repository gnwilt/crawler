//----------------------------------------------------------------------------------------
// 20170919: save html to mongodb, error request marked as no content for later refetch
// db.pages.remove({url: {$not: /.html$/}})
// db.pages.aggregate([{$match:{content:{$ne:null}}},{$group:{"_id":"$url","number":{$sum:1}}},{$match:{number:{$ne:1}}},{$group:{_id:1,count:{$sum:1}}}])
// db.pages.aggregate([{$match:{content:{$ne:null}}},{$group:{"_id":"$url","number":{$sum:1}}},{$match:{number:{$eq:1}}},{$group:{_id:1,count:{$sum:1}}}])
//----------------------------------------------------------------------------------------
//import Book from './models/book';
import Page from './models/page';
import sanitizeHtml from 'sanitize-html';
import cheerio from 'cheerio';
import request from 'request';
//import superagent from 'superagent';
//import charset from 'superagent-charset';
//import fs from 'fs';
//import iconv from 'iconv-lite'; 

var subs = [
  "romance",
  "newadult",
  "youngadult",
  "shortstories",
  "werewolves",
  "fantasy",
  "mystery",
  "thriller",
  "sf",
  "horror",
  "others",
  "Billionaire",
  "ChickLit",
  "vamp"];
var root = "http://www.onlinebook4u.net/";

var bookStat = {};
var bookList = [];
// var currDoc = {};
// var errs = [];

function loadList(list) {
  //console.log(list);
  //return;
  for(var i=0; i<list.length; i++){
    loadEntry(list[i]);
    //console.log(list[i]);
    //break;
  }
}

function loadEntry(url) {
  //console.log(url);
  request({ url: url, headers: {'User-Agent': 'Mozilla/5.0 (iPad; U; CPU OS 3_2_1 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Mobile/7B405'} }, 
  function(err, resp, body) { 
    var newPage = new Page();
    var $;
    if(err) {
      newPage.url = url;
      //console.log(url);
      newPage.save((err, saved) => {
        if (err) {
          console.log('error: ' + url);
        }
      });
      return;
    }
    else{
      $ = cheerio.load(body);
      newPage.url = url;
      newPage.content = body;
      newPage.save((err, saved) => {
        if (err) {
          console.log('error: ' + url);
        }
      });
    }

    if(err || !$('ul.pagelist').find('li').last() || !$('ul.pagelist').find('li').last().children()) return;
    var last = $('ul.pagelist').find('li').last().children()[0];
    if(!last) return;
    if(last.attribs.href=='#') return;
    if(last.children.length == 0) { console.log('error: ' + url); return; }
    if(last.children[0].data == 'Next') {
      var urlarr = url.split('/');
      urlarr[urlarr.length-1] = last.attribs.href;
      loadEntry(urlarr.join('/'));
    }
  });
}

function loadSubBooks(subBookList, url, sub){
  //console.log(url);
  request({ url: url, headers: {'User-Agent': 'Mozilla/5.0 (iPad; U; CPU OS 3_2_1 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Mobile/7B405'} }, 
    function(err, resp, body) { 
      var $ = cheerio.load(body);
      $('.content').find('a[target="_blank"]').each(function(i, v){
        if(bookList.indexOf(v.attribs.href)<0) {
          bookList.push(v.attribs.href);
          subBookList.push(root + v.attribs.href);
        }
      });
      var next;
      $('ul.pagelist').find('li').each(function(i,v){
        if(i > 1 && $(v).html().toLowerCase().indexOf('next')>=0){
          next=$(v).find('a')[0];
          return false;
        }
      });
      //console.log(url + (!next ? 'no next': next.attribs));
      if(!!next && !!next.attribs && next.attribs.href !== '#') {
        var urlarr = url.split('/');
        if(urlarr[urlarr.length-1].indexOf(sub)>=0) urlarr.push(next.attribs.href);
        else urlarr[urlarr.length-1] = next.attribs.href;
        loadSubBooks(subBookList, urlarr.join('/'), sub);
      }
      else{
        //bookStat[sub] = subBookList.length;
        //console.log(bookStat);
        //console.log(bookList.length);
        loadList(subBookList);
      }
  });
}

export default function() {
  for(var i=0;i<subs.length;i++){
    loadSubBooks([], root + subs[i], subs[i]);
  }
};
