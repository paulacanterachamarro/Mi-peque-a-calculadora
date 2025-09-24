const inputLine = document.getElementById("inputLine");
const outputLine = document.getElementById("outputLine");
let expr = "";

function update(){ inputLine.textContent = expr || "0"; }

document.querySelectorAll(".key").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const val = btn.textContent.trim();

    if(val==="="){
      try{
        let res = eval(expr.replace(/×/g,"*").replace(/÷/g,"/"));
        outputLine.textContent = res;
      }catch{ outputLine.textContent="Error"; }
    }
    else if(val==="AC"){ expr=""; outputLine.textContent=""; }
    else if(val==="DEL"){ expr=expr.slice(0,-1); }
    else{ expr+=val; }
    update();
  });
});

update();
