// progressive RGB Bloom Scrollbar (Looks so out of place tho lmao)

let progress = document.getElementById('progressbar');
let totalHeight = document.body.scrollHeight - window.innerHeight;
window.onscroll = function() {
  let progressHeight = (window.pageYOffset / totalHeight) * 100;
  progress.style.height = progressHeight + "%";
}

let target = document.querySelector('#quotes') //targeting quote box

let btnTGreen = document.querySelector('#tgreen');
let btnBlack = document.querySelector('#black');
let btnOGreen = document.querySelector('#ogreen');
let btnEmerald = document.querySelector('#emerald');

btnTGreen.addEventListener('click', () => target.style.backgroundColor='#B7E4C7' )
btnTGreen.addEventListener('click', () => target.style.color='#000' )

btnBlack.addEventListener('click', () => target.style.backgroundColor='#000' )
btnBlack.addEventListener('click', () => target.style.color='#FFF' )

btnOGreen.addEventListener('click', () => target.style.backgroundColor='#74C69D' )


btnEmerald.addEventListener('click', () => target.style.backgroundColor='#40916C' )

var quotes = new Array();
quotes[0] = "An emperor must wield two blades. Hope in one and surity in another.";
quotes[1] = "Life is what happens when you're busy making other plans.";
quotes[2] = "It is during our darkest moments that we must focus to see the light.";
quotes[3] = "Whoever is happy will make others happy too.";
quotes[4] = "The greatest glory in living lies not in never falling, but in rising every time we fall.";
quotes[5] = "Only a life lived for others is a life worthwhile.";
quotes[6] = "In three words I can sum up everything I've learned about life: it goes on.";
quotes[7] = "Whenever you find yourself on the side of the majority, it is time to pause and reflect.";
quotes[8] = "Kindness is the language which the deaf can hear and the blind can see.";
quotes[9] = "One must be careful of books, and what is inside them, for words have the power to change us."
quotes[10] = "I have lived my life best I could, not knowing its purpose, but drawn forward like a moth to a distant moon.";
quotes[11] = "Those who dare to fail miserably can achieve greatly.";
quotes[12] = "Be kind whenever possible. It is always possible.";
quotes[13] = "Life is Emperor's currency; spend it well.";

var ind = ranGen(); //Generates a random number within array limit

function printQuote() {
  var ptag = document.getElementById('quotes');
  ptag.innerHTML = quotes[ind]; //Prints random quote from the array using the random number retrieved above.
}

function ranGen() {
  var max = Math.floor(quotes.length);
  return Math.floor(Math.random() * max);
}


// function doCalc() {
//   val = document.getElementById('values').value;
//   var valueArray = val.split(',');
//   outputMin = document.getElementById('min');
//   outputMax = document.getElementById('max');
//   outputSum = document.getElementById('sum');
//   var aMax = 0;
//   var aMin = 999;
//   var sum = 0;
//
//   for (let i = 0; i < valueArray.length; i++) {
//     if (valueArray[i]>aMax) {
//       aMax = valueArray[i];
//     }
//     if (valueArray[i]<aMin) {
//       aMin = valueArray[i];
//     }
//   }
//
//
//   if(val>aMax) {
//     aMax = val;
//   }
//   if(val<aMin) {
//     aMin = val;
//   }
//
//   outputMin.innerHTML = aMin;
//   outputMax.innerHTML = aMax;
// }
