let slideIndex = 0;
let slideInterval;


function showSlides(n) {
  let slides = document.getElementsByClassName("mySlides");
  
  if (n >= slides.length) { slideIndex = 0; }
  if (n < 0) { slideIndex = slides.length - 1; }

  for (let i = 0; i < slides.length; i++) {
    slides[i].style.display = "none";
  }

  slides[slideIndex].style.display = "block";
}


function plusSlides(n) {
  clearInterval(slideInterval);
  slideIndex += n;
  showSlides(slideIndex);
  startAutoSlide();
}

function autoSlides() {
  slideIndex++;
  showSlides(slideIndex);
}


function startAutoSlide() {
  slideInterval = setInterval(autoSlides, 5000); 
}


window.onload = function() {
  showSlides(slideIndex);
  startAutoSlide(); 
};