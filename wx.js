var weather = require('./data/weather/weatherInfo');
var helper = require('./data/helper');
var getTags = require('./data/fdx/tag.js').getTags;

function WeiXin(fromInfo){
	var root = this.root = fromInfo.xml.child;
	this.ToUserName = root.ToUserName.text;
	this.FromUserName = root.FromUserName.text;
}
WeiXin.showTag = true;
var wxProp = WeiXin.prototype;
//发送文本
wxProp.textTmpl = function(content){
	return '<xml>'+
				'<ToUserName><![CDATA['+this.FromUserName+']]></ToUserName>'+
				'<FromUserName><![CDATA['+this.ToUserName+']]></FromUserName>'+
				'<CreateTime>'+(+new Date())+'</CreateTime>'+
				'<MsgType><![CDATA[text]]></MsgType>'+
				'<Content><![CDATA['+content+']]></Content>'+
				'<FuncFlag>0</FuncFlag>'+
			'</xml>';
}
wxProp.musicTmpl = function(){

}
//发送新闻消息
wxProp.newsTmpl = function(news){
	if(Object.prototype.toString.call(news) != '[object Array]'){
		news = [news];
	}
	var xml = '<xml>'+
				'<ToUserName><![CDATA['+this.FromUserName+']]></ToUserName>'+
				'<FromUserName><![CDATA['+this.ToUserName+']]></FromUserName>'+
				'<CreateTime>'+(+new Date())+'</CreateTime>'+
				'<MsgType><![CDATA[news]]></MsgType>'+
				'<ArticleCount>'+news.length+'</ArticleCount>'+
				'<Articles>';
	news.forEach(function(v,i){
			xml += '<item>'+
						'<Title><![CDATA['+v.title+']]></Title> '+
						'<Description><![CDATA['+v.desc+']]></Description>'+
						'<PicUrl><![CDATA['+v.picUrl+']]></PicUrl>'+
						'<Url><![CDATA['+v.url+']]></Url>'+
					'</item>';
	})
		xml += '</Articles>'+
				'<FuncFlag>1</FuncFlag>'+
			'</xml> ';
	return xml;
}
wxProp.parseText = function(callback){
	var _this = this;
	var content = this.root.Content.text;
	var replyContent = '';
	switch(content){
		case 'Hello2BizUser':
			replyContent = helper.welcome + '\n' + helper.help;
		case 'h':
		case 'help':
			replyContent = helper.welcome;
			break;
		case '天气':
		case 'tq':
		case 'TQ':
			replyContent = helper.weather;
			break;
		default :
			var match;
			if((match = content.match(/^(tq|TQ|天气)(.*?)$|^(.*?)(tq|TQ|天气)$/))){
				var city = match[2] || match[3];
				if(city){
					weather.getWeatherByCityName(city,function(err,weatherInfo){
						_this._parseWeatherResult(err,weatherInfo,callback);
					});
				}else{
					callback && callback(null, '请输入要查询天气的城市,如：tq北京,北京天气');
				}
			}else{
				replyContent = '您输入的「'+content+'」我不知道什么意思,下面的信息可能会帮到您\n\n'+helper.help;
			}
			
	}
	replyContent && callback && callback(null,_this.textTmpl(replyContent));
}
wxProp._parseWeatherResult = function(err,weatherInfo,callback){
	var _this = this;
	if(err){
		callback && callback(err);
	}else{
		var weatherText = [weatherInfo.city,weatherInfo.weather1,weatherInfo.temp1].join(' ');
		if(callback){
			if(WeiXin.showTag){
				getTags(weatherInfo.cityid,function(err,infoArr){
					var arr = [{title:weatherText,desc:'天气描述',picUrl:'https://devcenter.heroku.com/assets/public/heroku-header-logo.png',url:'http://www.fandongxi.com'}]
					infoArr.forEach(function(v,i){
						arr.push({title:v.tag.name,desc:v.tag.name+'desc',picUrl:v.imgs[0].src,'url':v.tag.href});
					});
					callback(null,_this.newsTmpl(arr));
				});
			}else{
				callback(null,_this.textTmpl(weatherText));
			}
		}
		// var res = WeiXin.showTag ?
		// 			this.textTmpl(weatherText):
		// 			this.newsTmpl([{
		// 				title: weatherText,
		// 				desc: '-desc',
		// 				picUrl: 
		// 			}]);
		// callback && callback(null,);
	}
}
wxProp.parseLocation = function(callback){
	var _this = this;
	var root = _this.root;
	var location = [root.Location_X.text,root.Location_Y.text].join();
	weather.getWeatherByLocation(location,function(err,weatherInfo){
		_this._parseWeatherResult(err,weatherInfo,callback);
	})
}
wxProp.parseEvent = function(){

}
module.exports = WeiXin;