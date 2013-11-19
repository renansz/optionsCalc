from django.db import models

class Option(models.Model):
    """ Representa uma opcao generica de um ativo """
    prefix  = models.CharField(max_length=4) 
    stock = models.CharField(max_length=5)
    
    def __unicode__(self):
        return "Option(%s, %s)" %(self.prefix, self.stock)
        
class Exercise(models.Model):
    """ Representa uma opcao generica de um ativo """
    year = models.IntegerField()
    serie  = models.CharField(max_length=1) 
    date = models.DateField()
#    
#    def __unicode__(self):
#        return "Option(%d, %s,"+str(self.date)+")" %(self.year, self.serie)
