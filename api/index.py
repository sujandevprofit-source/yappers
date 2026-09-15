import os
from datetime import datetime, timezone
import math
from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from supabase import create_client, Client
from io import BytesIO
from PIL import Image

app = FastAPI(docs_url="/api/docs", openapi_url="/api/openapi.json")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase Client (from env vars)
# We support standard Supabase keys or Vite variants for versatility
supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("VITE_SUPABASE_ANON_KEY")

supabase: Client = None
if supabase_url and supabase_key:
    try:
        supabase = create_client(supabase_url, supabase_key)
    except Exception as e:
        print(f"Error creating Supabase client: {e}")

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "yappers-python-api",
        "supabase_connected": supabase is not None
    }

@app.get("/api/feed")
async def get_ranked_feed(user_id: str = Query(None)):
    """
    Returns a community feed ranked by engagement and time decay (Hacker News algorithm)
    Formula: score = (likes * 2 + comments * 5) / (hours_since_creation + 2)^1.8
    """
    if not supabase:
        raise HTTPException(status_code=500, detail="Supabase connection not configured")

    try:
        # Fetch posts
        response = supabase.from_("posts").select(
            "id, caption, media_url, media_type, like_count, comment_count, created_at, user_id, profiles!user_id(id, username, full_name, avatar_url)"
        ).order("created_at", desc=True).execute()

        posts = response.data or []
        if not posts:
            return []

        now = datetime.now(timezone.utc)
        ranked_posts = []

        for post in posts:
            # Calculate time decay
            created_at = datetime.fromisoformat(post["created_at"].replace("Z", "+00:00"))
            age_seconds = (now - created_at).total_seconds()
            age_hours = age_seconds / 3600.0

            # Calculate engagement score
            likes = post.get("like_count", 0)
            comments = post.get("comment_count", 0)
            engagement = (likes * 2.0) + (comments * 5.0)

            # Hacker News algorithm formula
            score = engagement / math.pow(age_hours + 2.0, 1.8)
            post["ranking_score"] = score
            ranked_posts.append(post)

        # Sort posts by ranking score descending
        ranked_posts.sort(key=lambda x: x["ranking_score"], reverse=True)

        return ranked_posts

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate feed: {str(e)}")

@app.post("/api/process-media")
async def process_media(file: UploadFile = File(...)):
    """
    Accepts an uploaded image file, resizes it to max 1080px,
    compresses it, converts it to WebP format, and returns the binary file.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only images are supported by server-side processing")

    try:
        # Read uploaded image bytes
        contents = await file.read()
        img = Image.open(BytesIO(contents))

        # Preserve orientation if present in EXIF
        try:
            exif = img._getexif()
            if exif:
                for tag, value in exif.items():
                    if tag == 274:  # Orientation tag
                        if value == 3:
                            img = img.rotate(180, expand=True)
                        elif value == 6:
                            img = img.rotate(270, expand=True)
                        elif value == 8:
                            img = img.rotate(90, expand=True)
        except Exception:
            pass # EXIF reading is optional, ignore if fails

        # Resize to max 1080px width or height
        max_size = 1080
        width, height = img.size

        if width > max_size or height > max_size:
            if width > height:
                new_height = int((height * max_size) / width)
                new_width = max_size
            else:
                new_width = int((width * max_size) / height)
                new_height = max_size
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Save to WebP in memory
        output = BytesIO()
        img.save(output, format="WEBP", quality=80)
        output.seek(0)

        return Response(content=output.getvalue(), media_type="image/webp")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")
