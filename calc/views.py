# -*- coding: utf-8 -*-

from calc.models import Option,Exercise
from django.db.models import Q
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render, render_to_response
from django.template import RequestContext

from decimal import Decimal

import traceback
import datetime

import math
from scipy.stats import norm
from numpy import inf

import json
import re
from workdays import networkdays
from datetime import date

from urllib2 import urlopen
from BeautifulSoup import BeautifulSoup

holidays = [date(2013,11,20),date(2013,12,24),date(2013,12,25),date(2013,12,31),date(2014,01,01),date(2014,03,03),date(2014,03,04),date(2014,04,18),date(2014,04,21),date(2014,05,01),date(2014,06,19),date(2014,07,9),date(2014,11,20),date(2014,12,24),date(2014,12,25),date(2014,12,31),date(2015,01,01)]

class JsonResponse(HttpResponse):
    def __init__(self, content={}, status=None):
        super(JsonResponse, self).__init__(json.dumps(content), content_type='application/json', status=status)

def home(request):
    """View da homepage - calculadora principal """
    return render_to_response("calc/calc.html",{})
    
def getVolatility(request,stock,basePeriod = "3Meses"):
    """ Retorna a volatilidade anualizada calculada pela BMF&BOVESPA 
        com base no periodo selecionado - periodo padrao 3Meses"""
    api = "http://www.bmfbovespa.com.br/cias-listadas/volatilidade-ativos/ResumoVolatilidadeAtivos.aspx?metodo=padrao&periodo=%s&codigo=%s&idioma=pt-br"
    try:
      data = urlopen(api % (basePeriod,stock))
      soup = BeautifulSoup(data.read())
      data.close()
      volatility = soup.findAll('td', limit=5)[4].string
      response = {'status':'ok', 'volatility':volatility}
    except(e):
      response = {'status':'error', 'volatility': ''}
    #TODO arrumar o tratamento da string/tag 
    return JsonResponse(response, 201)

def getQuote(request,stock):
    """ Retorna o preço do ativo diretamente da consulta online da bmf bovespa"""
    api = 'http://www.bmfbovespa.com.br/cotacoes2000/formCotacoesMobile.asp?codsocemi=%s'
    try:
      data = urlopen(api % stock)
      soup = BeautifulSoup(data.read())
      data.close()
      pattern = re.compile(r"\d+,\d+")
      price = pattern.search(soup.papel['valor_ultimo']).group(0)
      response = {'status':'ok', 'price':price}
    except:
      response = {'status':'error', 'price':''}
    return JsonResponse(response, 201)

def getOptionQuote(request,stock):
    """ Retorna o preço da opção diretamente da consulta online da bmf bovespa, obtendo também o strike ajustado"""
    api = 'http://www.bmfbovespa.com.br/cotacoes2000/formCotacoesMobile.asp?codsocemi=%s'
    ativo_objeto = Option.objects.get(prefix=stock[:4])
    #busca os dados do derivativo
    try:
      data = urlopen(api % stock)
      soup = BeautifulSoup(data.read())
      data.close()
      pattern = re.compile(r"\d+,\d+")

      strike = pattern.search(soup.papel['descricao']).group(0)
      if not strike:
        strike = stock[-2:]
      price = pattern.search(soup.papel['valor_ultimo']).group(0)
      response = {'status':'ok', 'price':price, 'strike':strike}
    except:
      response = {'status':'error', 'price':'','strike':''}
    #busca os dados do ativo objeto
    try:
      data = urlopen(api % ativo_objeto.stock)
      soup = BeautifulSoup(data.read())
      data.close()
      pattern = re.compile(r"\d+,\d+")
      price = pattern.search(soup.papel['valor_ultimo']).group(0)
      response['stockPrice'] = price
      response['stock'] = ativo_objeto.stock
    except:
      response = {'status':'error', 'price':'','strike':'','stockPrice':'','stock':''}
    
    return JsonResponse(response, 201)
    
def getRemainingDays(request,stock):
    """ Retorna o numero de dias até o exercício da opcao. NÃO INCLUI O DIA DE HOJE!"""
    serie = stock[4]
    exercise = Exercise.objects.filter(Q(serie=serie,date__gte=date.today()))[0]
    days = networkdays(date.today(),exercise.date,holidays)
    response = {'status':'ok', 'days':days-1, 'exercise': exercise.date.strftime("%d/%m/%Y")}
    return JsonResponse(response, 201)
    
# Black and Scholes
def BlacknScholes(request,S=0,K=0,T=0,r=0,v=0,callFlag=True,year=252,internal=False):
  """ Retorna um vetor com o premio teorico da opcao mais as gregas relacionadas 
  ao calculo a partir dos parametros fornecidos"""  

  if not internal:
    #se o tipo for passado como parametro , configura o callFlag -> True = Call , Flase = Put
    #valor default = Call / True
    if request.GET.get('callFlag'):
      callFlag = request.GET.get('callFlag') 
    
    # se nao for passada a base de dias no ano, considera 252
    if request.GET.get('year'):
      year = request.GET.get('year')
    
    S = float(request.GET.get('S'))
    K = float(request.GET.get('K'))
    T = float(request.GET.get('T'))/year
    r = float(request.GET.get('r'))
    v = float(request.GET.get('v'))
  else:
    T = float(T)/year
  
  response = {'premium': 0 , 'greeks' : {}}
  d1 = (math.log(S / K) + (r + v * v / 2.0) * T) / (v * math.sqrt(T))
  d2 = d1 - v * math.sqrt(T)
  
  response['greeks']['gamma'] = norm.pdf(d1) / (S * v * math.sqrt(T))
    
  if callFlag:
    response['premium'] = S * norm.cdf(d1)-K * math.exp(-r * T) * norm.cdf(d2)
    response['greeks']['delta'] = norm.cdf(d1)
    response['greeks']['vega'] = S * norm.pdf(d1) * math.sqrt(T)/100.0
    response['greeks']['theta'] = (-S * norm.pdf(d1) * v / (2.0 * math.sqrt(T)) - r * K * math.exp(-r * T) * norm.cdf(d2))/year 
    response['greeks']['rho'] = K * T * math.exp(-r * T) * norm.cdf(d2)/100.0
    response['status'] = 'ok'
  else:
    response['premium'] = K * math.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)
    response['greeks']['delta'] = -norm.cdf(-d1)
    response['greeks']['vega'] = K * math.exp(-r * T) * norm.pdf(d2) * math.sqrt(T)/100.0
    response['greeks']['theta'] = (-S * norm.pdf(d1) * v / (2.0 * math.sqrt(T)) + r * K * math.exp(-r * T) * norm.cdf(-d2))/year
    response['greeks']['rho'] = -K * T * math.exp(-r * T) * norm.cdf(-d2)/100.0
    response['status'] = 'ok'
  
  if internal:
    return response
  else:
    return JsonResponse(response, 201)

#volatilidade implicita usando método de aproximacao de newton
#def impliedVolatility(S, K, T, r, realPremium,sigma = 0, CallFlag=True,max_iterations=20):
def impliedVolatility(request,max_iterations = 20):
  """ Retorna a volatilidade implícita do ativo calculando o black n scholes reverso 
  desde que a funcao de newton seja convergente para o intervalo de preco em questao.
  Retorna 0 caso as iterações nao convirjam para o resultado"""  

  #se o tipo for passado como parametro , configura o callFlag -> True = Call , Flase = Put
  #valor default = Call / True
  callFlag = True if not request.GET.get('callFlag') else request.GET.get('callFlag') 

  # se nao for passada a base de dias no ano, considera 252
  year = 252 if not request.GET.get('year') else request.GET.get('year')

  #se for passado o numero de iteração, lê
  if request.GET.get('max_iterations'): max_iterations = request.GET.get('max_iterations')

  #recebendo parametros e garantindo que todos os numeros estejam em formato float
  S = float(request.GET.get('S'))
  K = float(request.GET.get('K'))
  T = float(request.GET.get('T'))
  r = float(request.GET.get('r'))
  realPremium = float(request.GET.get('realPremium'))
  
  response = {}
  error = 0.00002
  # valor inicial sugerido (retirei do artigo que li)
  #sigma = math.sqrt(2.0*math.pi)*realPremium/S
  # volatilidade mais usual no mercado 25%
  sigma = 0.25  
  sigma_zero = 0.0
  i = 0
  try:
    while abs((sigma - sigma_zero)/sigma) > error and i < max_iterations:
      bs = BlacknScholes(request=None,S=S,K=K,T=T,r=r,v=sigma,callFlag=callFlag,year=year,internal=True);
      sigma_zero = sigma;
      sigma = sigma - (bs['premium'] - realPremium)/(bs['greeks']['vega']*100);
      i += 1;
  except:
    sigma = 0.0
  
  if sigma == inf or sigma == -inf or i == max_iterations or sigma == 0.0:
    response['status'] = 'error'
    response['sigma'] = 0.0
  else:
    response['status'] = 'ok'
    response['sigma'] = sigma
  
  return JsonResponse(response, 201)
