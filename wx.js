function WeiXin(fromInfo){
	this.fromInfo = fromInfo;

}
WeiXin.prototype.textTmpl = function(content){
	var root = this.fromInfo.xml;
	var ToUserName = root.ToUserName;
	var FromUserName = root.FromUserName;
	return '<xml>'+
				'<ToUserName><![CDATA['+FromUserName+']]></ToUserName>'+
				'<FromUserName><![CDATA['+ToUserName+']]></FromUserName>'+
				'<CreateTime>'+(+new Date())+'</CreateTime>'+
				'<MsgType><![CDATA[text]]></MsgType>'+
				'<Content><![CDATA['+content+']]></Content>'+
				'<FuncFlag>0</FuncFlag>'+
			'</xml>';
}
module.exports = WeiXin;