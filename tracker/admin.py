from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _
from .models import CustomUser, Project, WeeklyProgress

class CustomUserAdmin(UserAdmin):
    model = CustomUser
    list_display = ('email', 'first_name', 'last_name', 'is_active', 'is_staff')
    list_filter = ('is_active', 'is_staff', 'is_superuser')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('email',)

    fieldsets = (
        (None, {'fields': ('email', 'password')}), 
        (_('Personal info'), {'fields': ('first_name', 'last_name')}), 
        (_('Permissions'), {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}), 
        (_('Important dates'), {'fields': ('last_login',)}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'password1', 'password2', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
    )

class WeeklyProgressAdmin(admin.ModelAdmin):
    list_display = ('project', 'week_number', 'status', 'progress')
    list_filter = ('week_number', 'status')
    search_fields = ('project__name',)

admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(Project)
admin.site.register(WeeklyProgress, WeeklyProgressAdmin)
