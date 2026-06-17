import cloudinary
import cloudinary.uploader
from fastapi import HTTPException, status

from app.core.config import settings

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
)


def upload_file(file_content: bytes, folder: str = "school_erp") -> str:
    """
    Uploads a file to Cloudinary and returns the secure URL.
    """
    try:
        response = cloudinary.uploader.upload(file_content, folder=folder)
        return response.get("secure_url")
    except Exception as e:
        # Fail loudly instead of persisting a fake URL that looks valid.
        print(f"Cloudinary upload failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="File upload failed. Verify Cloudinary credentials are configured.",
        )
