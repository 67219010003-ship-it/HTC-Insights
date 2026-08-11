import os
from dotenv import load_dotenv

load_dotenv()

cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
api_key = os.getenv("CLOUDINARY_API_KEY")
api_secret = os.getenv("CLOUDINARY_API_SECRET")

# Mock or real Cloudinary service fallback
def upload_review_photo(file_bytes: bytes, filename: str) -> str:
    """Upload photo function with fallback mock for local dev/test"""
    if cloud_name and cloud_name != "mock_cloud":
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
    else:
        # Mock URL for local testing without cloud credentials
        import base64
        b64 = base64.b64encode(file_bytes[:100]).decode()
        return f"https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop&q=60"
