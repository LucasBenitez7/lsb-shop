from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("orders", "0002_order_card_brand_last4"),
    ]

    operations = [
        migrations.AddField(
            model_name="orderitem",
            name="compare_at_unit_minor_snapshot",
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
