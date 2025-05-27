from rest_framework import serializers
from .models import Project, WeeklyProgress

class WeeklyProgressSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True)
    project = serializers.PrimaryKeyRelatedField(queryset=Project.objects.all(), required=False)

    class Meta:
        model = WeeklyProgress
        fields = ['id', 'project', 'project_name', 'week_number', 'progress', 'status', 'description', 'created_at']

    def create(self, validated_data):
        project = self.context.get('project')
        if not project:
            project = validated_data.pop('project')  # fallback jika project dikirim via body
        return WeeklyProgress.objects.create(project=project, **validated_data)

class ProjectSerializer(serializers.ModelSerializer):
    weekly_progress = WeeklyProgressSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = ['id', 'name', 'start_date', 'end_date', 'status', 'priority', 'progress', 'weekly_progress']
