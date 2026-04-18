from django.contrib import admin
from unfold.admin import ModelAdmin

from apps.core.models import StoreSettings


@admin.register(StoreSettings)
class StoreSettingsAdmin(ModelAdmin):
    list_display = ("id", "hero_title", "sale_title", "updated_at")
