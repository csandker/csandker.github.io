
var CURRENT_HEADLINE_CLASS = 'current-headline';
var _anchors = null;

function anchors() {
  if (!_anchors) {
    _anchors = $("#markdown-toc a").map(function() {
        return $(this).attr("href");
    })
  }
  return _anchors
}
function tocItem(anchor) {
    return $("[href=\"" + anchor + "\"]");
}
function heading(anchor) {
    return $("[id=" + anchor.substr(1) + "]");
}
  

function currentAnchor() {
    var winY = window.pageYOffset;
    var currAnchor = null;
    anchors().each(function() {
      var y = heading(this).position().top;
      if (y < winY + window.innerHeight * 0.23) {
        currAnchor = this;
        return;
      }
    })
    return tocItem(currAnchor);
}

window.addEventListener('load', function () {

    // anchorheadings
    $('#post-content h2, h3, h4, h5, h6').each(function () {
        var heading = $(this).attr('id');
        if(heading){
            $(this).append('<a href="#'+heading+'" aria-hidden="true" class="aal_anchor"><svg aria-hidden="true" class="aal_svg" height="16" version="1.1" viewBox="0 0 16 16" width="16"><path fill-rule="evenodd" d="M4 9h1v1H4c-1.5 0-3-1.69-3-3.5S2.55 3 4 3h4c1.45 0 3 1.69 3 3.5 0 1.41-.91 2.72-2 3.25V8.59c.58-.45 1-1.27 1-2.09C10 5.22 8.98 4 8 4H4c-.98 0-2 1.22-2 2.5S3 9 4 9zm9-3h-1v1h1c1 0 2 1.22 2 2.5S13.98 12 13 12H9c-.98 0-2-1.22-2-2.5 0-.83.42-1.64 1-2.09V6.25c-1.09.53-2 1.84-2 3.25C6 11.31 7.55 13 9 13h4c1.45 0 3-1.69 3-3.5S14.5 6 13 6z"></path></svg></a>')
        }
    });

    // ToC
    $(window).scroll(function() {
        $(".post-toc a").removeClass(CURRENT_HEADLINE_CLASS);
        currentAnchor().addClass(CURRENT_HEADLINE_CLASS);
    });

    var originalPostToC = $("#markdown-toc");
    $(originalPostToC).addClass('post-toc');
    var clonedToc = $(originalPostToC).clone();
    $(clonedToc).appendTo('#toc-container');

    //
    if($('#toc-container').is(':empty')){
        $('#toc-container').remove();
    }

    // Theme Switch
    $('.switch-theme-btn').on('click', function(e){
        $('body').toggleClass('theme-light');
    });

    // Image Captions
    $('.post img').each(function(){
        if( $(this).attr('title') ){
            var imgCaption = $('<small>', {
                class: 'img-caption',
                text: $(this).attr('title')
            });
            $(imgCaption).insertAfter(this);
        }
    });
});


  
  