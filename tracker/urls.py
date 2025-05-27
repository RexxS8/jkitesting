from django.urls import path
from . import views
from .views import ProjectAPI, WeeklyProgressAPI

urlpatterns = [
    path('', views.login_view, name='login'),  # root URL = login
    path('index/', views.dashboard_view, name='index'),  # dashboard
    path('projects/', views.projects_view, name='projects'),  # project list
    # API Endpoints
    path('api/projects/', ProjectAPI.as_view(), name='project-list'),  # GET all, POST new
    path('api/projects/<int:pk>/', ProjectAPI.as_view(), name='project-detail'),  # GET, PUT, DELETE by ID
    path('api/projects/<int:project_id>/weekly-progress/', WeeklyProgressAPI.as_view(), name='weekly-progress'), # GET, POST by Project
]
