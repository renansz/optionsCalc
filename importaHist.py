#!/usr/bin/python
# -*- coding: utf-8 -*-
f = open('/home/seriall/Downloads/COTAHIST_A2013.TXT')

header = f.readline()
codigos_provaveis = {'ON ':'3','PN ':'4','PNA':'5','PNB':'6'}
opcoes = {}

for l in f.readlines()[:-1]:
  #obter todos os papeis que tiveram negociacoes de opcoes para pegar o nome do ativo de referencia
  if l[10:12] in ['78']: #se for opcao de compra, o correto seria ['78','82'] mas estou desprezando as PUTs
    if not opcoes.has_key(l[12:16]) and codigos_provaveis.has_key(l[39:42]):
      opcoes[l[12:16]] = l[12:16]+codigos_provaveis[l[39:42]]

f.close()

f = open('opcoes_fixture.json','w')
id = 1
f.write("[")
for k,v in opcoes.iteritems():
    f.write("""  {
    "model": "calc.option",
    "pk": %d,
    "fields": {
          "prefix": "%s",
          "stock": "%s"
    }
  },
  """ % (id,k,v))
    id += 1

f.seek(-4,1)

f.write("]")
f.close()
print "Groups Fixture created successfully"

