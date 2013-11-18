# -*- coding: utf-8 -*-
from django.http import HttpResponse, HttpResponseRedirect
import json
import re
from django.shortcuts import render, render_to_response
from django.template import RequestContext

from decimal import Decimal

import traceback
import datetime

from urllib2 import urlopen
from HTMLParser import HTMLParser
from BeautifulSoup import BeautifulSoup

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
    """ Retorna a volatilidade anualizada calculada pela BMF&BOVESPA 
        com base no periodo selecionado - periodo padrao 3Meses"""
    api = 'http://www.bmfbovespa.com.br/Pregao-online/ExecutaAcaoCotRapXSL.asp?txtCodigo=%s&intIdiomaXsl=0'
    try:
      data = urlopen(api % stock)
      soup = BeautifulSoup(data.read())
      data.close()
      price = soup.findAll('td', limit=2)[1].string
      m = re.search(r"\d+,\d+", price)
      price = m.group(0)
      response = {'status':'ok', 'price':price}
    except(e):
      response = {'status':'error', 'price':''}
    return JsonResponse(response, 201)

