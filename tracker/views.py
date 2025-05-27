from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import authenticate, login
from django.contrib import messages
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .serializers import ProjectSerializer, WeeklyProgressSerializer
from datetime import datetime, timedelta
from django.db.models import Q
from django.contrib.auth.decorators import login_required
from django.utils import timezone
import json
from django.core.serializers.json import DjangoJSONEncoder
from .models import Project, WeeklyProgress
import logging
from rest_framework.permissions import AllowAny

# Buat logger
logger = logging.getLogger(__name__)

@login_required(login_url='/login/')
def dashboard_view(request):
    projects = Project.objects.all()

    total_projects = projects.count()
    in_progress = projects.filter(status='In Progress').count()
    completed = projects.filter(status='Completed').count()

    overdue = projects.filter(
        Q(status='Not Started') | Q(status='In Progress'),
        end_date__lt=timezone.now()
    ).exclude(status='Completed').count()

    status_counts = {
        'Not Started': projects.filter(status='Not Started').count(),
        'In Progress': projects.filter(status='In Progress').count(),
        'Completed': projects.filter(status='Completed').count(),
    }

    progress_data = [
        {
            'name': project.name,
            'progress': project.progress
        }
        for project in projects
    ]

    # Data untuk FullCalendar
    project_events = [
    {
        "title": p.name,
        "start": p.start_date.strftime("%Y-%m-%d"),
        "end": (p.end_date + timedelta(days=1)).strftime("%Y-%m-%d"),  # Tambah 1 hari agar inclusive
        "color": "#3182CE"
    }
    for p in projects
]

    context = {
        'total_projects': total_projects,
        'in_progress': in_progress,
        'completed': completed,
        'overdue': overdue,
        'status_counts': json.dumps(status_counts),
        'progress_data': json.dumps(progress_data),
        'projects': json.dumps(project_events, cls=DjangoJSONEncoder)  # ← ini dikirim ke template
    }

    return render(request, 'tracker/index.html', context)

def login_view(request):
    if request.method == 'POST':
        email = request.POST.get('email')
        password = request.POST.get('password')

        user = authenticate(request, username=email, password=password)

        if user is not None:
            login(request, user)
            return redirect('index')
        else:
            messages.error(request, 'Invalid email or password.')

    return render(request, 'tracker/login.html')

@login_required(login_url='/login/')
def projects_view(request):
    # Ambil semua project dari database
    projects = Project.objects.all()

    # Kirim data project ke template
    context = {
        'projects': projects
    }

    return render(request, 'tracker/projects.html', context)

class ProjectAPI(APIView):
    permission_classes = [IsAuthenticated]
    
    # GET untuk list semua project atau detail satu project
    def get(self, request, pk=None):
        if pk:
            # Gunakan select_related dan prefetch_related untuk optimasi query
            project = get_object_or_404(Project.objects.prefetch_related('weekly_progress'), pk=pk)
            serializer = ProjectSerializer(project)
            return Response(serializer.data)
        else:
            projects = Project.objects.prefetch_related('weekly_progress').all()
            serializer = ProjectSerializer(projects, many=True)
            return Response(serializer.data)

    # POST untuk create project
    def post(self, request):
        serializer = ProjectSerializer(data=request.data)
        if serializer.is_valid():
            project = serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # PUT untuk update project
    def put(self, request, pk):
        project = get_object_or_404(Project, pk=pk)
        serializer = ProjectSerializer(project, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # DELETE untuk hapus project
    def delete(self, request, pk):
        project = get_object_or_404(Project, pk=pk)
        project.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
class WeeklyProgressAPI(APIView):
    #permission_classes = [IsAuthenticated]
    permission_classes = [AllowAny]
     # GET untuk list weekly progress dari project tertentu
    def get(self, request, project_id):
        """
        Mengambil daftar weekly progress dari suatu project.
        """
        project = get_object_or_404(Project, pk=project_id)
        weekly_progress = project.weekly_progress.all()
        serializer = WeeklyProgressSerializer(weekly_progress, many=True)
        return Response(serializer.data)
     # POST untuk menambahkan weekly progress ke project tertentu
    def post(self, request, project_id):
        print("\n[WeeklyProgressAPI] Data Diterima:", request.data)
        project = get_object_or_404(Project, pk=project_id)
        print(f"[WeeklyProgressAPI] Project ID {project_id} ditemukan: {project}")
    
        serializer = WeeklyProgressSerializer(
            data=request.data,
            context={'project': project}
        )
    
        if serializer.is_valid():
            print("[WeeklyProgressAPI] Data valid. Menyimpan...")
            serializer.save()
            self._update_project_progress(project)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            print("[WeeklyProgressAPI] Error validasi:", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    # PUT untuk update weekly progress
    def _update_project_progress(self, project):
        """
        Mengupdate nilai progress dari project berdasarkan rata-rata dari semua weekly progress.
        """
        weekly_progress = project.weekly_progress.all()
        if weekly_progress.exists():
            total = sum([wp.progress for wp in weekly_progress])
            average = total / weekly_progress.count()
            project.progress = round(average)
            project.save()