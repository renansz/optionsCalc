from django.conf.urls import patterns, include, url

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'CopaBroker.views.home', name='home'),
    # url(r'^CopaBroker/', include('CopaBroker.foo.urls')),
    url(r'^$', 'calc.views.home'),
    url(r'^api/getVolatility/(?P<stock>\w+)/$', 'calc.views.getVolatility'),
    url(r'^api/getQuote/(?P<stock>\w+)/$', 'calc.views.getQuote'),
    url(r'^book/(\w+)/$', 'calc.views.book'),
)


