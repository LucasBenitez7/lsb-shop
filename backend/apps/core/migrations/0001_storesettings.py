# Generated manually for phase 3 — store singleton configuration

from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies: list[tuple[str, str]] = []

    operations = [
        migrations.CreateModel(
            name="StoreSettings",
            fields=[
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True),
                ),
                (
                    "id",
                    models.PositiveSmallIntegerField(
                        default=1,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("hero_image", models.URLField(blank=True, max_length=2048)),
                ("hero_mobile_image", models.URLField(blank=True, max_length=2048)),
                ("hero_title", models.CharField(blank=True, max_length=255)),
                ("hero_subtitle", models.CharField(blank=True, max_length=512)),
                ("hero_link", models.URLField(blank=True, max_length=2048)),
                ("sale_image", models.URLField(blank=True, max_length=2048)),
                ("sale_mobile_image", models.URLField(blank=True, max_length=2048)),
                ("sale_title", models.CharField(blank=True, max_length=255)),
                ("sale_subtitle", models.CharField(blank=True, max_length=512)),
                ("sale_link", models.URLField(blank=True, max_length=2048)),
                ("sale_background_color", models.CharField(blank=True, max_length=32)),
            ],
            options={
                "verbose_name": "Store settings",
            },
        ),
        migrations.AddConstraint(
            model_name="storesettings",
            constraint=models.CheckConstraint(
                condition=models.Q(id=1),
                name="store_settings_singleton_pk",
            ),
        ),
    ]
