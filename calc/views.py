# -*- coding: utf-8 -*-
from django.http import HttpResponse, HttpResponseRedirect
from django.utils import simplejson
from django.shortcuts import render, render_to_response
from django.template import RequestContext

from decimal import Decimal

import traceback
import datetime


def home(request):
    """View da homepage - calculadora principal """

    return render_to_response("calc/calc.html",{})
