from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SoftDeleteModel(TimeStampedModel):
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True


class StoreSettings(TimeStampedModel):
    """
    Singleton row (pk=1): hero + sale blocks for the storefront (URLs + copy).
    Image fields store full Cloudinary (or other) URLs as strings.
    """

    id = models.PositiveSmallIntegerField(primary_key=True, default=1, editable=False)

    hero_image = models.URLField(max_length=2048, blank=True)
    hero_mobile_image = models.URLField(max_length=2048, blank=True)
    hero_title = models.CharField(max_length=255, blank=True)
    hero_subtitle = models.CharField(max_length=512, blank=True)
    hero_link = models.URLField(max_length=2048, blank=True)

    sale_image = models.URLField(max_length=2048, blank=True)
    sale_mobile_image = models.URLField(max_length=2048, blank=True)
    sale_title = models.CharField(max_length=255, blank=True)
    sale_subtitle = models.CharField(max_length=512, blank=True)
    sale_link = models.URLField(max_length=2048, blank=True)
    sale_background_color = models.CharField(max_length=32, blank=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(id=1),
                name="store_settings_singleton_pk",
            ),
        ]

    def save(self, *args, **kwargs) -> None:
        self.pk = 1
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return "Store settings"
