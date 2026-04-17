from __future__ import annotations

import structlog
from celery import shared_task
from cloudinary import api, uploader
from cloudinary import config as cloudinary_config
from django.conf import settings

from apps.core.cloudinary_utils import extract_cloudinary_public_id

log = structlog.get_logger()


@shared_task
def delete_cloudinary_urls_task(urls: list[str]) -> None:
    """
    Deletes Cloudinary assets by public_id derived from stored delivery URLs.

    Failures are logged and do not raise to callers (matches legacy console.warn).
    """
    if not urls:
        return

    cloudinary_config(
        cloud_name=settings.CLOUDINARY_STORAGE["CLOUD_NAME"],
        api_key=settings.CLOUDINARY_STORAGE["API_KEY"],
        api_secret=settings.CLOUDINARY_STORAGE["API_SECRET"],
    )

    for url in urls:
        if not url:
            continue
        public_id = extract_cloudinary_public_id(url)
        if not public_id:
            log.warning("cloudinary.delete_skipped", reason="unparseable_url", url=url)
            continue
        try:
            uploader.destroy(public_id, invalidate=True)
            log.info("cloudinary.deleted", public_id=public_id)
        except Exception as exc:
            log.warning(
                "cloudinary.delete_failed",
                public_id=public_id,
                error=str(exc),
            )


@shared_task
def cleanup_orphaned_cloudinary_images() -> None:
    """
    Remove Cloudinary images that are not referenced by any Product, Category,
    or StoreSettings row in the database.

    Scheduled via Celery Beat: runs weekly on Sundays at 3am.

    Only processes images in the configured folder (e.g., "lsb-shop/products/").
    """
    from apps.products.models import Category, Product

    cloudinary_config(
        cloud_name=settings.CLOUDINARY_STORAGE["CLOUD_NAME"],
        api_key=settings.CLOUDINARY_STORAGE["API_KEY"],
        api_secret=settings.CLOUDINARY_STORAGE["API_SECRET"],
    )

    # Collect all URLs currently stored in the database
    db_urls: set[str] = set()

    # Products: images stored in ProductImage.source_url
    for img in Product.objects.filter(deleted_at__isnull=True).prefetch_related(
        "images"
    ):
        for pi in img.images.all():
            if pi.source_url:
                db_urls.add(pi.source_url.strip())

    # Categories: image and mobile_image
    for cat in Category.objects.filter(deleted_at__isnull=True):
        if cat.image:
            db_urls.add(cat.image.strip())
        if cat.mobile_image:
            db_urls.add(cat.mobile_image.strip())

    # StoreSettings: hero and sale banners (singleton)
    from apps.core.models import StoreSettings

    try:
        store = StoreSettings.objects.get(pk=1)
        for field in (
            "hero_image",
            "hero_mobile_image",
            "sale_image",
            "sale_mobile_image",
        ):
            val = getattr(store, field, None)
            if val:
                db_urls.add(val.strip())
    except StoreSettings.DoesNotExist:
        pass

    # Extract public_ids from DB URLs
    db_public_ids = {
        extract_cloudinary_public_id(url)
        for url in db_urls
        if extract_cloudinary_public_id(url)
    }

    log.info("cloudinary.cleanup.started", db_refs=len(db_public_ids))

    # Fetch all resources from Cloudinary folder (configured prefix)
    folder_prefix = settings.CLOUDINARY_STORAGE.get("FOLDER_PREFIX", "lsb-shop")
    try:
        response = api.resources(
            type="upload",
            prefix=folder_prefix,
            max_results=500,
        )
        cloudinary_assets = response.get("resources", [])
    except Exception as exc:
        log.error("cloudinary.cleanup.list_failed", error=str(exc))
        return

    deleted_count = 0
    for asset in cloudinary_assets:
        public_id = asset.get("public_id", "")
        if not public_id:
            continue

        # If this public_id is not in the DB, it's orphaned
        if public_id not in db_public_ids:
            try:
                uploader.destroy(public_id, invalidate=True)
                deleted_count += 1
                log.info("cloudinary.orphan_deleted", public_id=public_id)
            except Exception as exc:
                log.warning(
                    "cloudinary.orphan_delete_failed",
                    public_id=public_id,
                    error=str(exc),
                )

    log.info("cloudinary.cleanup.completed", deleted=deleted_count)
