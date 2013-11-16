function getDecimalValue(s){
    return parseFloat(s.replace(/\,/,".")).toFixed(2);
}

/*function calcTotalPrice(){
    return accounting.formatMoney(parseFloat($("#formPreco").val().replace(/\,/,"."))*Number($("#formQtde").val()),"",2,".",",");
}*/


function generatePortfolio(data){
  var _html = "";
  var total = 0;
  var available = Number(getDecimalValue($("span[name=available]").html()));
  $.each(data,function(i,e){
    _lastPrice = getLastPrice(e[0]);
    _html+= "<tr name='team'>";
    _html+="<td name='name'><a href='book/"+e[0]+"'>"+e[0]+"</a></td>";
    _html+="<td name='price' class='text-right'>"+accounting.formatMoney(_lastPrice,"",2,".",",")+"</td>";
    _html+="<td name='quantity' class='text-center'>"+e[1]+"</td>";
    _html+="<td name='total' class='text-right'>"+accounting.formatMoney(_lastPrice*e[1],"",2,".",",")+"</td>"+"</td>";
    _html+="</tr>";
    total += _lastPrice*e[1];
  });
  $("tbody[name=myStocks]").html(_html);

	/*put the totals in the right place*/
	$("span[name=stocksTotal]").html(accounting.formatMoney(total,"",2,".",","));
	$("span[name=total]").html(accounting.formatMoney(total+available,"",2,".",","));
}



/* The Black and Scholes (1973) Stock option formula */

function BlackScholes(PutCallFlag, S, X, T, r, v) {

  var d1, d2;

  d1 = (Math.log(S / X) + (r + v * v / 2.0) * T) / (v * Math.sqrt(T));
  d2 = d1 - v * Math.sqrt(T);

  if (PutCallFlag == "c") 
    return S * CND(d1)-X * Math.exp(-r * T) * CND(d2);
  else
    return X * Math.exp(-r * T) * CND(-d2) - S * CND(-d1);

}

/* The cummulative Normal distribution function: */
function CND(x){
  var a1, a2, a3, a4 ,a5, k ;
  a1 = 0.31938153, a2 =-0.356563782, a3 = 1.781477937, a4= -1.821255978 , a5= 1.330274429;
  if(x<0.0)
    return 1-CND(-x);
  else
    k = 1.0 / (1.0 + 0.2316419 * x);
    return 1.0 - Math.exp(-x * x / 2.0)/ Math.sqrt(2*Math.PI) * k * (a1 + k * (-0.356563782 + k * (1.781477937 + k * (-1.821255978 + k * 1.330274429)))) ;

}


function Greeks(PutCallFlag, S, X, T, r, v){

/*  greeks = {'delta': 0.0, 'gama': 0.0,'theta': 0.0 ,'vega': 0.0, 'rho': 0.0}*/
  greeks = {'delta': 1.0, 'gamma': 2.0,'theta': 3.0 ,'vega': 4.0, 'rho': 5.0}

  var d1, d2;
  d1 = (Math.log(S / X) + (r + v * v / 2.0) * T) / (v * Math.sqrt(T));
  d2 = d1 - v * Math.sqrt(T);


    greeks['gamma'] = CND(d1) * (X*v*Math.sqrt(T));

  if (PutCallFlag == "c") {
    greeks['delta'] = CND(d1);
    greeks['vega'] = S * CND(d1) * Math.sqrt(T);
    greeks['theta'] = -S * CND(d1) * v / (2 * Math.sqrt(T)) - r * X * Math.exp(-r * T) * CND(d2) ;
    greeks['rho'] = X * T * Math.exp(-r * T) * CND(d2);
  }
  else {
    greeks['delta'] = CND(-d1);
    greeks['vega'] = X * Math.exp(-r * T) * CND(d2) * Math.sqrt(T);
    greeks['theta'] = -S * CND(d1) * v / (2 * Math.sqrt(T)) + r * X * Math.exp(-r * T) * CND(-d2) ;
    greeks['rho'] = -X * T * Math.exp(-r * T) * CND(-d2);
  }
    



  

  return greeks;
}

$(document).ready(function() {

  $("button[name=calcular]").click(function(){
  /*S= Stock price, X = strike, T = time (days /year), r= risk free (year), v = volatility(year), vi = intriseco , ve= extrinseco*/
      var tipo = "c";
      var S = Number($("input[name=precoAtivo]").val());
      var X = Number($("input[name=strike]").val());
      var T = Number($("input[name=dias]").val()/252);
      var r = Number($("input[name=txJuros]").val());
      var v = Number($("input[name=volatilidade]").val());      
      var p = BlackScholes(tipo,S,X,T,r,v);
      var vI = S > X ? parseFloat(S-X).toFixed(2) : 0 ; 

      var vE = p > (S - X) ? parseFloat(p - (S - X)).toFixed(2) : 0;      

      $("span[name=precoTeorico]").text(parseFloat(p).toFixed(2));
      $("span[name=valorIntrinseco]").text(vI);
      $("span[name=valorExtrinseco]").text(vE);
      

      var greeks = Greeks(tipo,S,X,T,r,v);
      $.each(greeks, function(i,e){
          $("span[name="+i+"]").text(parseFloat(e).toFixed(2));
      });


  });       
});
