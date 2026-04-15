# Partial unique slug among non-soft-deleted rows only

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("products", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="category",
            name="slug",
            field=models.SlugField(allow_unicode=True, max_length=255),
        ),
        migrations.AlterField(
            model_name="product",
            name="slug",
            field=models.SlugField(allow_unicode=True, max_length=255),
        ),
        migrations.AddConstraint(
            model_name="category",
            constraint=models.UniqueConstraint(
                condition=models.Q(deleted_at__isnull=True),
                fields=("slug",),
                name="products_category_slug_active_uniq",
            ),
        ),
        migrations.AddConstraint(
            model_name="product",
            constraint=models.UniqueConstraint(
                condition=models.Q(deleted_at__isnull=True),
                fields=("slug",),
                name="products_product_slug_active_uniq",
            ),
        ),
    ]
