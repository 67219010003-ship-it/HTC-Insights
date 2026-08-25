import os
import base64
import mimetypes
from dotenv import load_dotenv

load_dotenv()

cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
api_key = os.getenv("CLOUDINARY_API_KEY")
api_secret = os.getenv("CLOUDINARY_API_SECRET")

# Mock or real Cloudinary service fallback
def upload_review_photo(file_bytes: bytes, filename: str) -> str:
    """Upload photo function with fallback Base64 data URI for local dev/test"""
    if cloud_name and cloud_name not in ("mock_cloud", "your_cloud_name", "YOUR_CLOUDINARY_CLOUD_NAME"):
        try:
            import cloudinary
            import cloudinary.uploader
            cloudinary.config(
                cloud_name=cloud_name,
                api_key=api_key,
                api_secret=api_secret,
            )
            result = cloudinary.uploader.upload(
                file_bytes,
                folder="htc_insights/reviews",
                resource_type="image",
                transformation=[{"width": 1200, "crop": "limit", "quality": "auto"}],
            )
            return result["secure_url"]
        except Exception as e:
            print(f"[Cloudinary Warning] Upload failed: {e}. Falling back to Base64 data URI.")

    # Fallback: preserve exact user uploaded image via Base64 data URL
    mime_type, _ = mimetypes.guess_type(filename)
    if not mime_type or not mime_type.startswith("image/"):
        mime_type = "image/jpeg"
    b64_data = base64.b64encode(file_bytes).decode("utf-8")
    return f"data:{mime_type};base64,{b64_data}"
