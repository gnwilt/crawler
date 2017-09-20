//----------------------------------------------------------------------------------------
// 20170919: save html to mongodb, error request marked as no content for later refetch
// db.pages.remove({url: {$not: /.html$/}})
// db.pages.aggregate([{$match:{content:{$ne:null}}},{$group:{"_id":"$url","number":{$sum:1}}},{$match:{number:{$ne:1}}},{$group:{_id:1,count:{$sum:1}}}])
// db.pages.aggregate([{$match:{content:{$ne:null}}},{$group:{"_id":"$url","number":{$sum:1}}},{$match:{number:{$eq:1}}},{$group:{_id:1,count:{$sum:1}}}])
//----------------------------------------------------------------------------------------
import Book from './models/book';
import Page from './models/page';
import sanitizeHtml from 'sanitize-html';
import cheerio from 'cheerio';
import request from 'request';
//import superagent from 'superagent';
//import charset from 'superagent-charset';
//import fs from 'fs';
//import iconv from 'iconv-lite'; 

var urls = [
  "http://www.onlinebook4u.net/romance/",
  "http://www.onlinebook4u.net/newadult/",
  "http://www.onlinebook4u.net/youngadult/",
  "http://www.onlinebook4u.net/shortstories/",
  "http://www.onlinebook4u.net/werewolves/",
  "http://www.onlinebook4u.net/mistery/",
  "http://www.onlinebook4u.net/thriller/",
  "http://www.onlinebook4u.net/sf/",
  "http://www.onlinebook4u.net/horror/",
  "http://www.onlinebook4u.net/others/",
  "http://www.onlinebook4u.net/Billionaire/",
  "http://www.onlinebook4u.net/ChickLit/",
  "http://www.onlinebook4u.net/vamp/"];
var root = "http://www.onlinebook4u.net";

function loadList(list) {
  //console.log(list);
  //return;
	for(var i=0; i<list.length; i++){
		loadEntry(list[i]);
		//break;
	}
}

function loadEntry(url) {
  //console.log(url);
	request({ url: url, headers: {'User-Agent': 'Mozilla/5.0 (iPad; U; CPU OS 3_2_1 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Mobile/7B405'} }, 
	function(err, resp, body) { 
    var newPage = new Page();
    if(err) {
      newPage.url = url;
      console.log(url);
    }
    else{
      var $ = cheerio.load(body);
      newPage.url = url;
      newPage.content = sanitizeHtml($.html());
    }

    newPage.save((err, saved) => {
      if (err) {
        console.log('error: ' + url);
      }
      else{
        // console.log('success: ' + title);
      }
    });
    if(err || !$('ul.pagelist').find('li').last() || !$('ul.pagelist').find('li').last().children()) return;
    var last = $('ul.pagelist').find('li').last().children()[0];
    if(!last) return;
    var urlarr = url.split('/');
    urlarr[urlarr.length-1] = last.attribs.href;
    loadEntry(urlarr.join('/'));
	});
}

function loadPages(docList, url){
  //console.log(url);
  request({ url: url, headers: {'User-Agent': 'Mozilla/5.0 (iPad; U; CPU OS 3_2_1 like Mac OS X; en-us) AppleWebKit/531.21.10 (KHTML, like Gecko) Mobile/7B405'} }, 
    function(err, resp, body) { 
      var $ = cheerio.load(body);
      $('.content').find('a[target="_blank"]').each(function(i, v){
        docList.push(root + v.attribs.href);
      });
      var next;
      $('ul.pagelist').find('li').each(function(i,v){
        if(i > 1 && $(v).html().toLowerCase().indexOf('next')>=0){
          next=$(v).find('a')[0];
          return false;
        }
      });
      if(!!next && !!next.attribs && next.attribs.href !== '#') {
        var urlarr = url.split('/');
        urlarr[urlarr.length-1] = next.attribs.href;
        loadPages(docList, urlarr.join('/'));
      }
      else{
        loadList(docList);
      }
  });
}

export default function() {
  for(var i=0;i<urls.length;i++){
    loadPages([], urls[i]);
  }
};
