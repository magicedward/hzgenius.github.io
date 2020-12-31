(function(window) {
  if (typeof Utils === "undefined") {
    Utils = {};
  }

  function getQueryString(name) {
    var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)", "i");
    var r = window.location.search.substr(1).match(reg);
    if (r != null && typeof r != "undefined") {
      return unescape(r[2]);
    } else {
      return "";
    }
  }

  function unix2date(ts) {
    var a = new Date(ts * 1000);
    var year = a.getFullYear();
    var month = a.getMonth() + 1;
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    var time = year; /* + '-' + month + '-' + date + ' ' + hour + ':' + min + ':' + sec;*/
    time += ('-' + ((month < 10) ? ('0' + month) : month));
    time += ('-' + ((date < 10) ? ('0' + date) : date));
    time += (' ' + ((hour < 10) ? ('0' + hour) : hour));
    time += (':' + ((min < 10) ? ('0' + min) : min));
    time += (':' + ((sec < 10) ? ('0' + sec) : sec));
    return time;
  }

  function formatCommentTime(dateTimeStamp) {
    var minute = 1000 * 60;
    var hour = minute * 60;
    var day = hour * 24;
    var halfamonth = day * 15;
    var month = day * 30;
    var now = new Date().getTime();
    var diffValue = now - dateTimeStamp * 1000;
    if (diffValue < 0) {
      //非法操作
      return "";
    }
    var monthC = diffValue / month;
    var weekC = diffValue / (7 * day);
    var dayC = diffValue / day;
    var hourC = diffValue / hour;
    var minC = diffValue / minute;
    if (monthC >= 1) {
      // result = parseInt(monthC) + "个月前";
      result = unix2date(dateTimeStamp);
    } else if (weekC >= 1) {
      //result = parseInt(weekC) + "个星期前";
      result = unix2date(dateTimeStamp);
    } else if (dayC >= 1) {
      result = unix2date(dateTimeStamp);
      // result = parseInt(dayC) + "天前";
    } else if (hourC >= 1) {
      result = parseInt(hourC) + "个小时前";
    } else if (minC >= 1) {
      result = parseInt(minC) + "分钟前";
    } else {
      result = "刚刚发表";
    }
    return result;
  }

  function isset() {
    for (var i = 0; i < arguments.length; i++) {
      if (typeof arguments[i] === 'undefined' || arguments[i] === null) {
        return false;
      }
    }
    return true;
  }

  function parseURL(url) {
    var a = document.createElement('a');
    a.href = url;
    return {
      source: url,
      protocol: a.protocol.replace(':', ''),
      host: a.hostname,
      port: (a.port == null || a.port == undefined || a.port == '') ? 80 : a.port,
      query: a.search,
      params: (function() {
        var ret = {},
          seg = a.search.replace(/^\?/, '').split('&'),
          len = seg.length,
          i = 0,
          s;
        for (; i < len; i++) {
          if (!seg[i]) {
            continue;
          }
          s = seg[i].split('=');
          ret[s[0]] = s[1];
        }
        return ret;
      })(),
      file: (a.pathname.match(/\/([^\/?#]+)$/i) || [, ''])[1],
      hash: a.hash.replace('#', ''),
      path: a.pathname.replace(/^([^\/])/, '/$1'),
      relative: (a.href.match(/tps?:\/\/[^\/]+(.+)/) || [, ''])[1],
      segments: a.pathname.replace(/^\//, '').split('/')
    };
  }

  function getLocalUrl() {
    return window.location.protocol + "//" + window.location.host + window.location.pathname + window.location.search;
  }

  function getLocalUrlParams() {
    return parseURL(getLocalUrl());
  }

  function closeWindow() {
    window.opener = null;
    window.open(' ', '_self', ' ');
    window.close();
  }

  Utils.unix2date = unix2date;
  Utils.getQueryString = getQueryString;
  Utils.formatCommentTime = formatCommentTime;
  Utils.isset = isset;
  Utils.getLocalUrlParams = getLocalUrlParams;
  Utils.closeWindow = closeWindow;
}(window));