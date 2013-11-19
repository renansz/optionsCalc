# -*- coding: utf-8 -*-

from calc.models import Option,Exercise
from django.db.models import Q
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render, render_to_response
from django.template import RequestContext

from decimal import Decimal

import traceback
import datetime

import json
import re
from workdays import networkdays
from datetime import date

from urllib2 import urlopen
from HTMLParser import HTMLParser
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
    
    
    
