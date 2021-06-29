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

var data = document.getElementById("values").value;

var sum = data.split(",").reduce(function(prev,curr){
  return parseInt(prev,10) + parseInt(curr,10);
});
