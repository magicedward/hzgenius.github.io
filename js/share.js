$(function() {
  var serverUrl = "http://hizen.carassist.cn:10000";

  // 获取帖子id
  var postid = parseInt(Utils.getQueryString("postid")) || 0;
  if (postid <= 0) {
    $('#main_content_section').hide();
    $('#post_not_exist_section').show();
    return;
  }

  $('#main_content_section').show();
  getPostInfo();

  function getPostInfo() {
    var requrl = serverUrl + "/api/?d=postget";
    var query = {};
    query.postid = postid;
    requrl += JSON.stringify(query);
    $.ajax({
      type: 'GET',
      url: requrl,
      dataType: 'jsonp',
      jsonp: "jsonp",
      jsonpCallback: function() {
      },
      timeout: 20000,
      context: this,
      global: false,
      success: function(data) {
        var ret = data.ret;
        if (ret !== 0) {
          $('#main_content_section').hide();
          $('#post_not_exist_section').show();
          return;
        }

        // 设置帖子内容
        var authorimg = data.authorimg || "img/header_default.png";
        var author = data.author || "海圳慧眼用户";
        var time = data.time || "";
        var views = data.views || 0;
        var up = data.up || 0;
        var location = data.location || "";
        var comments = data.comments || 0;
        var subject = data.subject || " ";

        $('#author_img').html('<span style="background-image:url(' + authorimg + ')"></span>');
        $('#author_name').html(author);
        $('#post_time_location').html('' + Utils.formatCommentTime(time) + ' ' + location);
        $('#post_subject').html(subject);
        $('#comments_size').html('总共' + comments + '条');

        // 判断帖子类型
        // 目前只支持一个视频或多张图片
        var attachments = data.atts || [];
        if (attachments.length === 0) {
          $('#main_content_section').hide();
          $('#post_not_exist_section').show();
          return;
        }

        var postType = attachments[0].type || 0;
        if (postType === 1) {
          // 视频
          $('#loading_post_content').hide();
          $('#videolist').show();
          var videourl = attachments[0].url;
          var thumburl = data.thumburl || (videourl + "?vframe/jpg/offset/3/w/320/h/180");
          $("#video_view").attr({
            "src": videourl,
            "poster": thumburl
          });
        } else if (postType === 2) {
          // 图片
          $('#loading_post_content').hide();
          $('#imagelist').show();
          if (attachments.length === 1){
            var imgurl = 'url(' + attachments[0].url + ')';
            $('#imagelist').css("background-image",imgurl);
            $('#imagelist').css('background-size', '100%');
            $('#imagelist').css('height', 200);
            $('#imagelist').css('background-repeat', 'repeat-x|repeat-y');
          }else{
            for (var i = 0; i < attachments.length; i++) {
              var attachment = attachments[i];
              var imghtml = '<li><div class="ui-grid-halve-img" style="min-height:50px;"><span style="background-image:url(';
              imghtml += (attachment.url + ')"></span></div></li>');
              $('#imagelist').append(imghtml);
            }
          }
        } else {
          // 暂不支持其他类型
          $('#main_content_section').hide();
          $('#post_not_exist_section').show();
          return;
        }

        $('#post_subject').html();
        getCommentInfo();
      },
      error: function(xhr, type) {
      }
    });
  }

  function getCommentInfo() {
    var requrl = serverUrl + "/api/?d=commentlist";
    var query = {};
    query.postid = postid;
    requrl += JSON.stringify(query);
    $.ajax({
      type: 'GET',
      url: requrl,
      dataType: 'jsonp',
      jsonp: "jsonp",
      jsonpCallback: function() {},
      timeout: 20000,
      context: this,
      global: false,
      success: function(data) {
        var ret = data.ret;
        if (ret !== 0) {
          $('#loading_comment_content').html('暂无评论内容');
          return;
        }

        var commentList = data.list || [];
        if (commentList.length === 0) {
          $('#loading_comment_content').html('暂无评论内容');
        } else {
          $('#loading_comment_content').hide();
          $('#commentlist').show();
          for (var i = 0; i < commentList.length; i++) {
            var comment = commentList[i];
            var authorimg = comment.authorimg || "images/header_deault.png";
            var author = comment.author || "海圳慧眼用户";
            var time = Utils.formatCommentTime(comment.time || 0);
            var msg = comment.msg || "";
            var innerhtml = '<li class="ui-border-t">';
            innerhtml += ('<div class="ui-avatar-s"><span style="background-image:url(' + authorimg + ')"></span></div>');
            innerhtml += ('<div class="ui-list-info"><h4 class="ui-nowrap">' + author + ' <label style="font-size: 10px;">' + time + '</label></h4><p class="ui-nowrap">' + msg + '</p></div>');
            innerhtml += ('</li>');
            $('#commentlist').append(innerhtml);
          }
        }
      },
      error: function(xhr, type) {
        $('#loading_comment_content').html('暂无评论内容');
      }
    });
  }

});