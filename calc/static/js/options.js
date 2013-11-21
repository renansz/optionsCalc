var ano_base = 252;

function getDecimalValue(s){
    return parseFloat(s.replace(/\,/,".")).toFixed(2);
}


$(document).ready(function() {
  $.ajaxSetup({ timeout: 5000 });

  $("li a").click(function(){
    $.each($(".painel"), function(i,e){
      $(e).addClass("hidden");
    });
    $(".painel[id="+$(this).text().toLowerCase()+"]").removeClass("hidden");
  });
  
  
  $("button[name=calcular]").click(function(){
  /*S= Stock price, K = strike, T = time (days), r= risk free (year), v = volatility(year), vi = intriseco , ve= extrinseco*/
      var tipo = "c";
      var S = Number(getDecimalValue($("input[name=precoAtivo]").val()));
      var K = Number(getDecimalValue($("input[name=strike]").val()));
      var T = Number($("input[name=dias]").val());
      var r = Number(getDecimalValue($("input[name=txJuros]").val())/100.0);
      var v = Number(getDecimalValue($("input[name=volatilidade]").val())/100.0);
      var bs = {};
      /* valores intrinseco e extrinseco*/
      var vI = S > K ? parseFloat(S-K).toFixed(2) : 0 ;
      var vE = 0;

      $.get("/calc/api/BlacknScholes/",{'S':S, 'K': K, 'T': T, 'r': r, 'v': v})
        .done(function(data){
          bs = data;
          vE = bs['premium'] > (S - K) ? parseFloat(bs['premium'] - (S - K)).toFixed(2) : 0;
          $("span[name=precoTeorico]").text(parseFloat(bs['premium']).toFixed(2));
          $("span[name=valorIntrinseco]").text(vI);
          $("span[name=valorExtrinseco]").text(vE);
          /*Exibindo as gregas*/
          $.each(bs['greeks'], function(i,e){
            $("span[name="+i+"]").text(parseFloat(e).toFixed(4));
          });
        })
        .fail(function(){
          alert("Ocorreu um erro ao tentar calcular o Black and Scholes com estes parâmetros");
        });

  });
  
  $("button[name=calcular-vol]").click(function(){
  /*S= Stock price, K = strike, T = time (days /year), r= risk free (year), v = volatility(year), vi = intriseco , ve= extrinseco*/
      var tipo = "c";
      var S = Number(getDecimalValue($("input[name=precoAtivo-vol]").val()));
      var K = Number(getDecimalValue($("input[name=strike-vol]").val()));
      var T = Number($("input[name=dias-vol]").val());
      var r = Number(getDecimalValue($("input[name=txJuros]").val())/100.0);
      var marketPrice = Number(getDecimalValue($("input[name=precoOpcao-vol]").val()));
      var iv = {};

      $.get("/calc/api/impliedVolatility/",{'S':S, 'K': K, 'T': T, 'r': r, 'realPremium': marketPrice})
        .done(function(data){
          iv = data;
          if (iv['status'] == 'ok'){
            $("span[name=volatilidadeImplicita]").text(parseFloat(iv['sigma']*100.0).toFixed(2)+'%');
          }else{
            alert('nao convergiu');          
          }
        })
        .fail(function(){
          alert("Ocorreu um erro ao tentar calcular o Black and Scholes com estes parâmetros");
        });


      
  });
  
  /* auto-refresh ao escolher um ativo*/
  $("input[name=inputStock]").keydown(function(event) {
    if (event.which == 13 || event.which == 9 ){
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
      $.get("/calc/api/getQuote/"+$(this).val().toUpperCase())
        .done(function(data){
           $("input[name=precoAtivo]").val(data['price']);
         })
        .fail(function(){
          alert("Nao foi possível obter a cotação do ativo através do site da bovespa");
        })
        .always(function(){
          $("span[name=loading-price-bs]").html('');
        })
      }
    });


  /* auto-refresh ao escolher um ativo para o calculo da volatilidade implicita*/
  $("input[name=inputStock-volatility]").keydown(function( event ) {
    if (event.which == 13 || event.which == 9){
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
      }
    });

  /*Ativa os tooltips*/
  $("input[name=volatilidade]").tooltip();
  $("input[name=txJuros]").tooltip();

});
