var ano_base = 252;

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
  var greeks = {'delta': 0.0, 'gama': 0.0,'theta': 0.0 ,'vega': 0.0, 'rho': 0.0}
  var premium = 0.0;

  d1 = (Math.log(S / X) + (r + v * v / 2.0) * T) / (v * Math.sqrt(T));
  d2 = d1 - v * Math.sqrt(T);

  greeks['gamma'] = ND(d1) / (S*v*Math.sqrt(T));

  if (PutCallFlag == "c") {
    premium = S * CND(d1)-X * Math.exp(-r * T) * CND(d2);     
    greeks['delta'] = CND(d1);
    greeks['vega'] = S * ND(d1) * Math.sqrt(T);
    greeks['theta'] = (-S * ND(d1) * v / (2 * Math.sqrt(T)) - r * X * Math.exp(-r * T) * CND(d2))/ano_base ;
    greeks['rho'] = X * T * Math.exp(-r * T) * CND(d2);
  }
  else {
    premium = X * Math.exp(-r * T) * CND(-d2) - S * CND(-d1);
    greeks['delta'] = -CND(-d1);
    greeks['vega'] = X * Math.exp(-r * T) * ND(d2) * Math.sqrt(T);
    greeks['theta'] = (-S * ND(d1) * v / (2 * Math.sqrt(T)) + r * X * Math.exp(-r * T) * CND(-d2))/ano_base ;
    greeks['rho'] = -X * T * Math.exp(-r * T) * CND(-d2);
  }
  return [premium , greeks];
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

/* The Normal distribution function: */
function ND(x){
  return Math.exp(-(x*x)/2)/Math.sqrt(2*Math.PI);
}

function selecionaPainel(painel){
  var paineis = ["calculadora","volatidade","acoes"];
  $.each(paineis, function(i,e){
    if (e != painel) $("div[id="+e+"]").hide();
    else $("div[id="+e+"]").show();
  });
}

function impliedVolatility(PutCallFlag, S, X, T, r, v, marketPrice){
  /*initial guess from bovespa */
  var error = 0.0002;
  var sigma = 0.0;
  var sigma_zero = -100.0;
  var bs = 0.0; 
  var max_iterations = 15;
  var i = 0;
  
  /* valor inicial aproximado da média das empresas que negociam opcoes -> aprox. 25% */
  v == 0 ? sigma = 0.25 : sigma = v;
  
  while ( (Math.abs((sigma - sigma_zero)/sigma) > error) || (i< 10)){
    bs = BlackScholes(PutCallFlag,S,X,T,r,sigma);
    sigma_zero = sigma;
    sigma = sigma - (bs[0] - marketPrice)/bs[1]['vega'];
    i++;
  }
  return sigma;
}

$(document).ready(function() {
  $.ajaxSetup({ timeout: 0 });

  $("li a").click(function(){
    $.each($(".painel"), function(i,e){
      $(e).addClass("hidden");
    });
    $(".painel[id="+$(this).text().toLowerCase()+"]").removeClass("hidden");
  });
  
  
  $("button[name=calcular]").click(function(){
  /*S= Stock price, X = strike, T = time (days /year), r= risk free (year), v = volatility(year), vi = intriseco , ve= extrinseco*/
      var tipo = "c";
      var S = Number(getDecimalValue($("input[name=precoAtivo]").val()));
      var X = Number(getDecimalValue($("input[name=strike]").val()));
      var T = Number($("input[name=dias]").val()/ano_base);
      var r = Number(getDecimalValue($("input[name=txJuros]").val())/100.0);
      var v = Number(getDecimalValue($("input[name=volatilidade]").val())/100.0);
      var bs = BlackScholes(tipo,S,X,T,r,v);
      var vI = S > X ? parseFloat(S-X).toFixed(2) : 0 ;
      var vE = bs[0] > (S - X) ? parseFloat(bs[0] - (S - X)).toFixed(2) : 0;

      $("span[name=precoTeorico]").text(parseFloat(bs[0]).toFixed(2));
      $("span[name=valorIntrinseco]").text(vI);
      $("span[name=valorExtrinseco]").text(vE);
      

      /*Exibindo as gregas*/
      $.each(bs[1], function(i,e){
          $("span[name="+i+"]").text(parseFloat(e).toFixed(4));
      });
      
  });
  
  $("button[name=calcular-vol]").click(function(){
  /*S= Stock price, X = strike, T = time (days /year), r= risk free (year), v = volatility(year), vi = intriseco , ve= extrinseco*/
      var tipo = "c";
      var S = Number(getDecimalValue($("input[name=precoAtivo-vol]").val()));
      var X = Number(getDecimalValue($("input[name=strike-vol]").val()));
      var T = Number($("input[name=dias-vol]").val()/ano_base);
      var r = Number(getDecimalValue($("input[name=txJuros]").val())/100.0);
      var marketPrice = Number(getDecimalValue($("input[name=precoOpcao-vol]").val()));
      var im = impliedVolatility(tipo, S, X, T, r, 0.0,marketPrice);

      $("span[name=volatilidadeImplicita]").text(parseFloat(im).toFixed(4));
  });
  
  /* auto-refresh ao escolher um ativo*/
  $("input[name=inputStock]").focusout(function() {
    /*obtem volatilidade do site da bovespa (periodo anualizado de 3 meses por padrao)*/
    $("span[name=loading-vol-bs]").html('<img src="../static/img/ajax-loader-sm.gif" />');
    $.get("/calc/api/getVolatility/"+$(this).val().toUpperCase())
      .done(function(data){
         $("input[name=volatilidade]").val(data['volatility']);
       })
      .fail(function(){
        alert("Nao foi possível obter a volatilidade do ativo através do site da bovespa");
      })
      .always(function(){
        $("span[name=loading-vol-bs]").html('');
      })
    /*obtem preço do papel site da bovespa*/
    $("span[name=loading-price-bs]").html('<img src="../static/img/ajax-loader-sm.gif" />');
    $.get("/calc/api/getQuote/"+$(this).val())
      .done(function(data){
         $("input[name=precoAtivo]").val(data['price']);
       })
      .fail(function(){
        alert("Nao foi possível obter a cotação do ativo através do site da bovespa");
      })
      .always(function(){
        $("span[name=loading-price-bs]").html('');
      })
    });


  /* auto-refresh ao escolher um ativo para o calculo da volatilidade implicita*/
  $("input[name=inputStock-volatility]").focusout(function() {
    /*obtem preço do ativo consultando o site bmf bovespa*/
    $("span[name=loading-precoOpcao-vol]").html('<img src="../static/img/ajax-loader-sm.gif" />');
    $("span[name=loading-strike-vol]").html('<img src="../static/img/ajax-loader-sm.gif" />');
    $("span[name=loading-precoAtivo-vol]").html('<img src="../static/img/ajax-loader-sm.gif" />');
    $.get("/calc/api/getOptionQuote/"+$(this).val().toUpperCase())
      .done(function(data){
        $("input[name=precoOpcao-vol]").val(data['price']);
        $("input[name=strike-vol]").val(data['strike']);
        $("input[name=precoAtivo-vol]").val(data['stockPrice']);
        $("span[name=ativoObjeto]").text(data['stock']);
       })
      .fail(function(){
        alert("Nao foi possível obter as informações da opção inserida.");
      })
      .always(function(){
        $("span[name=loading-precoOpcao-vol]").html('');
        $("span[name=loading-strike-vol]").html('');
        $("span[name=loading-precoAtivo-vol]").html('');
      })

    /*obtem a data de vencimento e a quantidade de dias uteis até o vencimento da opcao*/
    $("span[name=loading-vencimento-vol]").html('<img src="../static/img/ajax-loader-sm.gif" />');
    $("span[name=loading-dias-vol]").html('<img src="../static/img/ajax-loader-sm.gif" />');
    $.get("/calc/api/getRemainingDays/"+$(this).val().toUpperCase())
      .done(function(data){
        $("span[name=vencimento]").text(data['exercise']);
        $("input[name=dias-vol]").val(data['days']);
       })
      .fail(function(){
        alert("Nao foi possível obter a data de exercicio do ativo escolhido.");
      })
      .always(function(){
        $("span[name=loading-vencimento-vol]").html('');
        $("span[name=loading-dias-vol]").html('');
      })
    });

  /*Ativa os tooltips*/
  $("input[name=volatilidade]").tooltip();
  $("input[name=txJuros]").tooltip();

});
