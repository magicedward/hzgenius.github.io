// server
var mLocalUrlParams = null;
var mServerUrl = "ws://hizen.carassist.cn:8000";
var mWs = null;
var BEAT_HEART_TIMEOUT = 60000;
var mKeepAliveTimeout = 0;
var mIsExpired = false;

// baidu map
var mBaiduMapGeolocation = null;
var mBaiduMapGeocoder = null;
var mBaiduMapConvertor = null;
var mMyLocationMarker = null;
var mCarLocationMarker = null;
var mMyLocationPoint = null;
var mCarLocationPoint = null;
var mMyLocationAddress = null;
var mLocCitySuccess = false;

//
var mLoadingDialog = null;
var mChangeLocation = false;

var mPickerName = "海圳慧眼用户";
var mPickerComing = false;

// 错误码
var ERR_OK = 0;
var ERR_UNMATCH_PROTOCOL = 1;
var ERR_LOST_PARAM = 2;
var ERR_LOGIN_FAILED = 3;
var ERR_BAD_REQUEST = 4;
var ERR_PEER_NOT_EXIST = 5;
var ERR_TOKEN_EXPIRED = 6;
var ERR_NOT_ONLINE = 7;
var ERR_SERVER_BUSY = 17;

// ws state
var WS_STATE_CONNECTING = 0;
var WS_STATE_OPEN = 1;
var WS_STATE_CLOSING = 2;
var WS_STATE_CLOSED = 3;

// 坐标类型
var COORD_TYPE_GPS = 0;
var COORD_TYPE_BD0911 = 0X01;

// 页面加载完成后执行，此处可以优化
//window.onload = function() {
mLocalUrlParams = Utils.getLocalUrlParams();
$('#location_address').html('请稍候...');
if (Utils.isset(mLocalUrlParams.params) && Utils.isset(mLocalUrlParams.params.token)) {
  mLoadingDialog = $.loading({
    content: '加载中...'
  });

  $('#header_section').show();
  $('#footer_section').show();
  $('#main_section').show();

  initEvent();
  initBaiduMap();
  connectServer();
} else {
  $('#expired_section').show();
}
//};

function initBaiduMap() {
  mBaiduMap = new BMap.Map("baidumap_div");
  mBaiduMapGeocoder = new BMap.Geocoder();
  mBaiduMapGeolocation = new BMap.Geolocation();

  mBaiduMap.enableScrollWheelZoom(true);
  mBaiduMap.enableDragging();
  mBaiduMap.addEventListener("dragstart", onBaiduMapDragstart);
  mBaiduMap.addEventListener("dragend", onBaiduMapDragend);

  $('#location_address').html('定位中...');
  // 优化定位效率，首先根据ip定位显示城市，再根据浏览器定位定位具体位置
  // 此处ip定位和浏览器定位的地方有可能差别较大
  // 因此首先小比例尺进行ip定位加载地图，然后浏览器定位，最后再进行放大
  var myCity = new BMap.LocalCity();
  myCity.get(onLocCityCallback);
  mBaiduMapGeolocation.getCurrentPosition(onBaiduMapCurrentPosition);
}

function onLocCityCallback(result) {
  mLocCitySuccess = true;
  //mLoadingDialog.loading("hide");
  var cityName = result.name;
  mBaiduMap.centerAndZoom(cityName, 10);
}

function initEvent() {
  $('#zoom_in').on('click', onZoominClicked);
  $('#zoom_out').on('click', onZoomoutClicked);
  $('#loc_my').on('click', onLocMyClicked);
  $('#loc_car').on('click', onLocCarClicked);
  $('#btn_send_location').on('click', onBtnSendLocationClicked);
  $('#modify_location_section').on('click', onBtnModityLocationClicked);
}

function onZoominClicked(e) {
  if (Utils.isset(mBaiduMap)) {
    if (mBaiduMap.getZoom() >= 19) {
      return;
    }
    mBaiduMap.setZoom(mBaiduMap.getZoom() + 1);
  }
}

function onZoomoutClicked(e) {
  if (Utils.isset(mBaiduMap)) {
    if (mBaiduMap.getZoom() <= 3) {
      return;
    }
    mBaiduMap.setZoom(mBaiduMap.getZoom() - 1);
  }
}

function onLocMyClicked(e) {
  $('#baidumap_location_pin').hide();
  if (Utils.isset(mBaiduMap, mMyLocationPoint)) {
    mBaiduMap.panTo(mMyLocationPoint);
    if (Utils.isset(mMyLocationMarker)) {
      mMyLocationMarker.setPosition(mMyLocationPoint);
      mMyLocationMarker.setAnimation(BMAP_ANIMATION_BOUNCE);
      mBaiduMapGeocoder.getLocation(mMyLocationPoint, onBaiduMapGeocoder);
      setTimeout(function() {
        mMyLocationMarker.setAnimation(null);
      }, 2000);
    }

  }
}

function onLocCarClicked(e) {
  if (Utils.isset(mBaiduMap, mCarLocationPoint)) {
    mBaiduMap.panTo(mCarLocationPoint);
    mCarLocationMarker.setAnimation(BMAP_ANIMATION_BOUNCE);
    setTimeout(function() {
      mCarLocationMarker.setAnimation(null);
    }, 2000);
  }
}

function onBaiduMapDragstart() {
  if (isChangeLocation()) {
    return;
  }
  $('#baidumap_location_pin').show();
}

function onBaiduMapDragend(type, target, pixel, point) {
  if (isChangeLocation()) {
    return;
  }
  var centerPoint = mBaiduMap.getCenter();
  //mMyLocationPoint = centerPoint; // 修复定位问题
  $('#baidumap_location_pin').hide();
  if (Utils.isset(mMyLocationMarker)) {
    mMyLocationMarker.setPosition(centerPoint);
  }

  mBaiduMapGeocoder.getLocation(centerPoint, onBaiduMapGeocoder);
}

function onBaiduMapGeocoder(result) {
  var addComp = result.addressComponents;
  //var address = addComp.province + addComp.city + addComp.district + addComp.street  + addComp.streetNumber;
  var address = result.address || '未知地名';
  mMyLocationAddress = result.address;
  var surroundingPois = result.surroundingPois;
  if (surroundingPois.length > 0) {
    mMyLocationAddress = surroundingPois[0].title;
    address = surroundingPois[0].title + ('附近<br/>') + address;
  }
  $('#location_address').html(address);
}

function onBaiduMapCurrentPosition(result) {
  if (this.getStatus() == BMAP_STATUS_SUCCESS) {
    if (Utils.isset(mLoadingDialog)) {
      mLoadingDialog.loading("hide");
      mLoadingDialog = null;
    }
    if (!mPickerComing && !mIsExpired) {
      $.tips({
        content: '如果定位不准，请移动地图调整您的位置',
        stayTime: 2000,
        type: "warn"
      });
    }
    mMyLocationPoint = result.point;
    if (mLocCitySuccess) {
      mBaiduMap.panTo(mMyLocationPoint);
      setTimeout(function() {
        mBaiduMap.setZoom(15);
      }, 1000);
    } else {
      //mBaiduMap.centerAndZoom(mMyLocationPoint, 15);
    }
    mBaiduMapGeocoder.getLocation(mMyLocationPoint, onBaiduMapGeocoder);
    mMyLocationMarker = new BMap.Marker(mMyLocationPoint);
    var label = new BMap.Label("您的位置", {
      offset: new BMap.Size(-20, -25)
    });
    mMyLocationMarker.setLabel(label);
    mBaiduMap.addOverlay(mMyLocationMarker);

    if (Utils.isset(mCarLocationPoint)) {
      var points = [];
      points.push(mMyLocationPoint);
      points.push(mCarLocationPoint);
      mBaiduMap.setViewport(points);
    }
  } else {
    $.tips({
      content: '没有定位到您的位置，请刷新浏览器或重新进入',
      stayTime: 2000,
      type: "warn"
    });
  }
}

function onBtnSendLocationClicked() {
  var ctx = '接车位置为: ' + mMyLocationAddress + '<br/>确定要通知您的好友来接你吗？';
  if (mPickerComing) {
    ctx = '您的新接车位置为: ' + mMyLocationAddress + '<br/>确定要通知给您的好友吗？';
  }
  var dia = $.dialog({
    allowScroll: false,
    content: ctx,
    button: ["取消", "确定"]
  });
  dia.on("dialog:action", function(e) {
    if (e.index === 1) {
      // 提示
      if (Utils.isset(mLoadingDialog)) {
        mLoadingDialog.loading("hide");
        mLoadingDialog = null;
      }

      var content = '请求接车中，请稍候...';
      if (mPickerComing) {
        content = '正在发送新的位置给您的好友，请稍候...';
      }
      mLoadingDialog = $.loading({
        content: content
      });

      setTimeout(function() {
        if (Utils.isset(mLoadingDialog)) {
          mLoadingDialog.loading("hide");
          mLoadingDialog = null;
        }
      }, 15000);

      mMyLocationPoint = mBaiduMap.getCenter();
      sendPickup(mBaiduMap.getCenter(), 'pickup');
    }
  });
}

function onBtnModityLocationClicked() {
  mChangeLocation = true;
  if (Utils.isset(mMyLocationMarker, mMyLocationPoint)) {
    mMyLocationMarker.setPosition(mMyLocationPoint);
  }
  mMyLocationMarker.setAnimation(BMAP_ANIMATION_BOUNCE);
  setTimeout(function() {
    mMyLocationMarker.setAnimation(null);
  }, 2000);

  $('#modify_location_section').hide();
  $('#footer_section').show();
}

function isChangeLocation() {
  return $('#modify_location_section').css('display') !== 'none';
}

/**********************************************************************/
function connectServer() {
  if (mWs != null) {
    mWs.close();
  }
  mWs = null;
  mWs = new WebSocket(mServerUrl);
  mWs.binaryType = 'arraybuffer';
  mWs.onopen = onWsOpenCb;
  mWs.onclose = onWsCloseCb;
  mWs.onmessage = onWsMessageCb;
}

function disconnectServer() {
  if (mWs != null) {
    mWs.close();
  }
}

function sendCmd(cmd) {
  if (!checkNetworkConnect()) {
    return;
  }
  mWs.send(cmd);
}

function checkNetworkConnect() {
  if (mWs == null || mWs.readyState != WS_STATE_OPEN) {
    return false;
  }
  return true;
}

function sendKeepAlive() {
  var msg = 'keepalive{' + '}';
  sendCmd(msg);
}

function sendBeatHeart() {
  if (mKeepAliveTimeout != 0) {
    clearTimeout(mKeepAliveTimeout);
    mKeepAliveTimeout = 0;
  }
  mKeepAliveTimeout = setTimeout("sendKeepAlive()", BEAT_HEART_TIMEOUT);
}

function onWsOpenCb() {
  requestUserInfo();
}

function onWsCloseCb() {
  if (!mIsExpired) {
    $.tips({
      content: '网络异常，请检查您的网络',
      stayTime: 2000,
      type: "warn"
    });
  }
}

function onWsMessageCb(evt) {
  if (event.data instanceof Blob) {
    //processBlobMessage(event.data);
  } else if (event.data instanceof ArrayBuffer) {
    processArrayBufferMessage(event.data);
  } else if (typeof evt.data === "string") {
    processStringMessage(event.data);
  } else {

  }
}

function processArrayBufferMessage(data) {}

function processStringMessage(data) {
  var msg = JSON.parse(data);
  if (!Utils.isset(msg) || !Utils.isset(msg.f)) {
    return;
  }

  switch (msg.f) {
    case 'keepalive':
      sendBeatHeart();
      break;
    case 'cmd':
      onGotCmdMessage(msg);
      break;
    case 'curgps':
      onGotCarLocation(msg);
      break;
    default:
      break;
  }
}

function onGotCarLocation(msg) {
  $('#picker_status').html('正在来接您的路上');
  if (!mPickerComing) {
    mPickerComing = true;
    $('#footer_section').hide();
    $('#modify_location_section').show();
  }

  var gpsinfo = {};
  gpsinfo.tm = msg.tm;
  gpsinfo.lat = msg.lat / 1000000.0;
  gpsinfo.lon = msg.lon / 1000000.0;
  gpsinfo.ext = msg.ex;
  gpsinfo.coordType = gpsinfo.ext >>> 30;
  gpsinfo.altitude = ((gpsinfo.ext << 2) & 0xFFFFFFFF) >> 18;
  gpsinfo.angle = ((gpsinfo.ext & 0xFFFF) >>> 7);
  gpsinfo.speed = (gpsinfo.ext & 0x7F);

  var carPoint = new BMap.Point(gpsinfo.lon, gpsinfo.lat);
  if (gpsinfo.coordType === COORD_TYPE_BD0911) {
    updateCarLocation(carPoint, gpsinfo.angle);
  } else {
    // 转换坐标
    var gpsPoints = [];
    gpsPoints.push(carPoint);
    if (!Utils.isset(mBaiduMapConvertor)) {
      mBaiduMapConvertor = new BMap.Convertor();
    }
    mBaiduMapConvertor.translate(gpsPoints, 1, 5, function(result) {
      var errmsg;
      if (result.status !== 0) {
        errmsg = 'translate error';
      } else {
        errmsg = 'translate ok';
        updateCarLocation((result.points)[0], gpsinfo.angle);
      }
    });
  }
}

function updateCarLocation(point, angle) {
  mCarLocationPoint = point;
  if (!Utils.isset(mCarLocationMarker)) {
    var myIcon = new BMap.Icon('img/car.png', new BMap.Size(16, 30), { //是引用图标的名字以及大小，注意大小要一样
      anchor: new BMap.Size(8, 15) //这句表示图片相对于所加的点的位置
    });

    mCarLocationMarker = new BMap.Marker(point, {
      icon: myIcon
    });
    //  var label = new BMap.Label("好友的位置", {
    //    offset: new BMap.Size(-20, -25)
    //  });
    //  mCarLocationMarker.setLabel(label);
    mBaiduMap.addOverlay(mCarLocationMarker);

    if (Utils.isset(mMyLocationPoint)) {
      var points = [];
      points.push(mMyLocationPoint);
      points.push(mCarLocationPoint);
      mBaiduMap.setViewport(points);
    }
  } else {
    mCarLocationMarker.setPosition(point);
    mCarLocationMarker.setRotation(angle);
  }
}

function onGotCmdMessage(msg) {

  if (!Utils.isset(msg.cookie)) {
    return;
  }

  if (msg.cookie == 'userinfo') {
    if (msg.ret === ERR_OK) {
      sendKeepAlive();
      mPickerName = msg.name || '海圳慧眼用户';
      var pickerHeaderImg = msg.img || 'img/header_default.png';
      var headerimgurl = "url(" + pickerHeaderImg + ")";
      $('#picker_name').html(mPickerName);
      $('#picker_headerimg').css('background-image', headerimgurl);
      $('#picker_status').html('正准备来接您');
    } else {
      if (Utils.isset(mLoadingDialog)) {
        mLoadingDialog.loading("hide");
        mLoadingDialog = null;
      }
      $('#header_section').hide();
      $('#footer_section').hide();
      $('#main_section').hide();
      $('#expired_section').show();
      mIsExpired = true;
      disconnectServer();
    }
  } else if (msg.cookie == 'pickup') {
    mChangeLocation = false;
    var tipsContent = "";
    if (Utils.isset(mLoadingDialog)) {
      mLoadingDialog.loading("hide");
      mLoadingDialog = null;
    }
    if (msg.ret === ERR_OK) {
      tipsContent = "已经通知你的好友来接您，请稍等！";
    } else {
      $('#send_location').removeAttr('disabled');
      tipsContent = "请求失败";
      if (msg.ret === ERR_TOKEN_EXPIRED) {
        mIsExpired = true;
        tipsContent = "请求失败，分享已失效请联系您的好友";
        disconnectServer();
      } else if (msg.ret === ERR_PEER_NOT_EXIST) {
        tipsContent = "请求失败，您的好友不存在";
      } else if (msg.ret === ERR_NOT_ONLINE) {
        tipsContent = "请求失败，您的好友不在线";
      } else if (msg.ret === ERR_SERVER_BUSY) {
        tipsContent = "请求失败，服务器异常，请重新尝试";
      }
    }
    $.tips({
      content: tipsContent,
      stayTime: 2000,
      type: "warn"
    });

  }
}

function sendPickup(point, cmdtype) {
  var cmd = {};
  cmd.addr = mMyLocationAddress;
  cmd.cmd = "pickup";
  cmd.coordtype = COORD_TYPE_BD0911;
  if (Utils.isset(point)) {
    cmd.lng = point.lng;
    cmd.lat = point.lat;
  } else {
    // 获取用户信息
    cmd.lng = 0;
    cmd.lat = 0;
  }
  var cmdStr = "cmd:" + cmdtype + JSON.stringify(cmd);
  // XXX: javascript not support int64
  var tokenstr = "\"token\":" + mLocalUrlParams.params.token;
  cmdStr = cmdStr.replace(/}$/, ",");
  cmdStr += (tokenstr + "}");
  sendCmd(cmdStr);
}

function requestUserInfo() {
  sendPickup(null, 'userinfo');
}