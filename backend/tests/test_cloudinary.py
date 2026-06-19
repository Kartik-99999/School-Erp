import app.utils.cloudinary as cu


def test_upload_file_uses_auto_resource_type(monkeypatch):
    """Regression: non-image docs (pdf/docx/xlsx/zip/txt) must not be forced through the
    image pipeline. upload_file must pass resource_type='auto' so Cloudinary stores them
    as 'raw' instead of rejecting them with 'Invalid image file'."""
    captured = {}

    def fake_upload(content, **kwargs):
        captured.update(kwargs)
        return {"secure_url": "https://res.cloudinary.com/x/raw/upload/v1/f/y.txt"}

    monkeypatch.setattr(cu.cloudinary.uploader, "upload", fake_upload)
    url = cu.upload_file(b"hello", folder="school_erp/test")
    assert url.endswith("y.txt")
    assert captured.get("resource_type") == "auto"
    assert captured.get("folder") == "school_erp/test"
