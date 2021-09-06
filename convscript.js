var input = document.getElementById('input');
var result = document.getElementById('result');
var inputType = document.getElementById('inputType');
var inputTypeValue;

input.addEventListener("keyup", convert);
inputType.addEventListener("change", convert);

inputTypeValue = inputType.value;

function convert() {
  inputTypeValue = inputType.value;

  if(inputTypeValue === "kg") {
    result.value = Number(input.value)*0.4536;
  }
  else if(inputTypeValue === "lb") {
    result.value = Number(input.value)*2.2046;
  }
}

function sumNums(inp) {
  var sum = 0;
  for (let x = 0; x < inp.length; x++) {
    sum += inp[x];
  }
  return sum;
}

function reverse(inp) {
  var r_array = [];
  for (let x = inp.length-1 ; x>=0; x--) {
    r_array.push(inp[x])
  }
  return r_array;
}

var sum = 0;

var inpTarg = document.getElementById('calc_inp')

inpTarg.addEventListener("keyup", calculate);
inpTarg.addEventListener("change", calculate);

function calculate() {
  var m_inp = document.getElementById('calc_inp').value;
  var split_inps = m_inp.split(",").map(Number);
  if(split_inps[split_inps.length-1] == 0) {
    split_inps.pop();
  }

  sum = sumNums(split_inps);
  var avg = (sum/split_inps.length).toFixed(3);
  var min = Math.min.apply(null, split_inps);
  var max = Math.max.apply(null, split_inps);
  var rev_array = reverse(split_inps);

  document.getElementById("sum_otp").value = sum;
  document.getElementById("avg_otp").innerHTML = avg;
  document.getElementById("min_otp").innerHTML = min;
  document.getElementById("max_otp").innerHTML = max;
  document.getElementById("rev_val").innerHTML = rev_array;
}
