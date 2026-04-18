from apps.users.privacy import mask_email_for_demo, mask_phone_for_demo


def test_mask_email_for_demo_shape() -> None:
    assert mask_email_for_demo("juan@gmail.com") == "j***@***.com"
    assert mask_email_for_demo("") == ""
    assert mask_phone_for_demo("+34666555444") == "***"
