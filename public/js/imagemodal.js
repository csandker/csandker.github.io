window.addEventListener('load', function () {

  // Get the modal
  var modal = document.getElementById("imageModal");
  
  // Get the image and insert it inside the modal - use its "alt" text as a caption
  var postContainer = document.getElementById('post-content');
  var modalImg = document.getElementById("imgModal");
  if( postContainer ){
    var imgs = postContainer.getElementsByTagName('img');
  
    for (var i = 0; i < imgs.length; i++) {
      img = imgs[i];
      img.onclick = function(){
        // Display image
        modal.style.display = "block";
        modalImg.src = this.src;
        // prevent body scrolling
        document.getElementsByTagName('body')[0].style.overflow = "hidden"
      };
    };
  }
  
  
  // Get the <span> element that closes the modal
  var span = document.getElementsByClassName("close")[0];
  
  // When the user clicks on <span> (x), close the modal
  span.onclick = function() {
    modal.style.display = "none";
    // enable body scrolling
    document.getElementsByTagName('body')[0].style.overflow = "auto"
  }
})