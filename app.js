var http = require('http');
var url = require('url');
var crypto = require('crypto');
var xml = require("util/xml2json");
var WeiXin = require('./data/weixin');
var log = require('util/logger').log;
var sysLog = require('util/logger').print;
var fs = require('fs');
var staticFile = require('util/staticFile');

process.env.TZ = 'Asia/Shanghai';
//检测是否是静态文件，现在只支持txt|ico
function _isStatic(reqUrl){
	return /\.(txt|ico|json)$/.test(reqUrl);
}
function _isStaticDirc(reqUrl){
	return /^\/(log|data)/.test(reqUrl);
}
function _isSign(reqUrl){
	var params = url.parse(reqUrl,true).query;
	var sha1Str = [params.nonce,params.timestamp,'tonnyzhang'].sort().join('');

	var signature = crypto.createHash('sha1').update(sha1Str).digest('hex');
	
	return params.signature == signature;
}
http.createServer(function (req, res) {
	var response = function(code,resMsg,logMsg){
		log(reqMethod,code,reqUrl,logMsg?'[ '+logMsg+' ]':(code >= 500?resMsg:''));
		res.writeHead(code,{'Content-Type':'text/html;charset=utf-8'});
		res.end(resMsg);
	}
	var reqMethod = req.method.toUpperCase();
	var reqUrl = staticFile.formatPath(req.url);

	var params = url.parse(reqUrl,true).query;
	var sha1Str = [params.nonce,params.timestamp,'tonnyzhang'].sort().join('');

	var signature = crypto.createHash('sha1').update(sha1Str).digest('hex');
	
	var isSign = params.signature == signature;
	if(reqMethod == 'GET' && _isStatic(reqUrl)|| !isSign){
		var result = staticFile.parsePath(reqUrl);
		response(result.state,result.html);	
	}else{		
		if(isSign){
			if(reqMethod == 'GET'){
				response(200,params.echostr);
			}else{
				var message = '';
				req.on('data',function(d){
					message += d.toString();
				}).on('end',function(){
					xml.parse2Json(message,function(err,result){
						var fn = function(err,msg){
							var logMsg = ['POST_XML',message,JSON.stringify(err||result)].join(' _ ');
							if(err){
								response(500,JSON.stringify(err));
							}else{
								response(200,msg,logMsg);
							}
						}
						if(!err){
							var weiXin = new WeiXin(result);
							var res_xml;
							switch(result.xml.child.MsgType.text){
								/*{"xml":{"ToUserName":"gh_8f47ec7c055d","FromUserName":"o7fAGj-j4y-Ey5nvTTE1Z9wwyCY4","CreateTime":"1363159184","MsgType":"text","Content":"Hello2BizUser","MsgId":"5854724114522046464"}}*/
								case 'text'://Hello2BizUser[关注]
									weiXin.parseText(fn);
									return;
									break;
								case 'image':
									break;
								/*{"xml":{"ToUserName":"gh_8f47ec7c055d","FromUserName":"o7fAGj-j4y-Ey5nvTTE1Z9wwyCY4","CreateTime":"1363159225","MsgType":"location","Location_X":"40.032572","Location_Y":"116.417331","Scale":"15","Label":"中国北京市朝阳区红军营南路 邮政编码: 100107","MsgId":"5854724290615705652"}}*/
								case 'location':
									weiXin.parseLocation(fn);
									return;
									break;
								case 'link':
									break;
								case 'event'://unsubscribe
									break;
								/*{"xml":{"ToUserName":"gh_8f47ec7c055d","FromUserName":"o7fAGj-j4y-Ey5nvTTE1Z9wwyCY4","CreateTime":"1363159317","MsgType":"voice","MediaId":"I3eQNJsxF-LtHxN9HXtUVFiaE4SmSlrHBmJqJoZThD5sfDvNFOKIRprIeIKjQzAL","Format":"amr","MsgId":"5854724685752696886"}}*/
								case 'voice':
									break;
								default:
							}
							res_xml || (res_xml = weiXin.textTmpl('我正在学习'));
							fn(null,res_xml);
						}else{
							response(500,'parse xml error!');
						}
					},true)
				}).on('err',function(err){
					response('500','receive post error!');
				});
			}
		}else{
			response(200,'no weiXin');
		}
	}
}).listen(process.env.PORT || 5000, null);

//生成全部数据缓存
(function(){
	var child_process = require('child_process');
	var time = [6,12,18];
	var delay = 10;
	function getDelay(){
		var date = new Date();
		var hours = date.getHours();
		var closetHours = time.filter(function(v,i){
			return v > hours;
		});
		var delayDate = new Date();
		var delayHours = closetHours.shift();
		if(!delayHours){
			delayHours = time[0];
			delayDate.setDate(delayDate.getDate()+1);//第二天的第一个时间
		}
		
		delayDate.setHours(delayHours);
		delayDate.setMinutes(30);
		delayDate.setSeconds(0);
		delay = delayDate.getTime() - date.getTime();
	}
	function run(){
		process.nextTick(function(){
			setTimeout(function(){
				sysLog('cache all data');
				child_process.fork('./data/weather/tool/story.js').on('message',function(){
					getDelay();
					sysLog('cache all date complete,after '+delay+' milliseconds cache again!');
					this.kill();
					run();
				})
			},delay);
		});
	}
	run();
})();
