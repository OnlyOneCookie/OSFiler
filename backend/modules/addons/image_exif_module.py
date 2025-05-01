import logging
from datetime import datetime
from typing import Dict, Any, Optional
import requests
from io import BytesIO
from PIL import Image, ExifTags
import base64

from backend.modules.base import BaseModule
from backend.modules.utils import ModuleResultBuilder

logger = logging.getLogger(__name__)

def make_json_serializable(obj):
    if isinstance(obj, dict):
        return {k: make_json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [make_json_serializable(v) for v in obj]
    elif hasattr(obj, 'numerator') and hasattr(obj, 'denominator'):
        # Handle PIL.TiffImagePlugin.IFDRational and similar
        try:
            return float(obj)
        except Exception:
            return str(obj)
    elif isinstance(obj, (int, float, str, type(None))):
        return obj
    else:
        return str(obj)

class ImageExifModule(BaseModule):
    """
    Image EXIF Extractor module for OSFiler.
    Allows users to upload an image or provide a URL, extracts EXIF data, and returns a card with the image and its properties.
    """
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.name = "image_exif_module"
        self.display_name = "Image EXIF Extractor"
        self.description = "Extracts EXIF metadata from an image (upload or URL) and displays it."
        self.version = "0.1.0"
        self.author = "OSFiler Team"
        self.required_params = [
            {
                "name": "image_file",
                "type": "file",
                "description": "Image file to analyze (optional if image_url is provided)"
            },
            {
                "name": "image_url",
                "type": "string",
                "description": "URL to an image (optional if image_file is provided)"
            }
        ]
        self.optional_params = []
        self.category = "media"
        self.tags = ["image", "exif", "metadata"]
        self.has_config = False

    def validate_params(self, params: Dict[str, Any]) -> bool:
        # At least one of image_file or image_url must be present and non-empty
        image_file = params.get("image_file")
        image_url = params.get("image_url")
        if (image_file and (hasattr(image_file, 'file') or hasattr(image_file, 'read') or isinstance(image_file, bytes))) or (image_url and isinstance(image_url, str) and image_url.strip()):
            return True
        logger.error("Missing required parameter: either image_file or image_url must be provided")
        return False

    def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        image_file = params.get("image_file")
        image_url = params.get("image_url")
        image_bytes = None
        filename = None
        image_source = None
        if image_file:
            if hasattr(image_file, 'file'):
                image_bytes = image_file.file.read()
                filename = getattr(image_file, 'filename', None)
            elif hasattr(image_file, 'read'):
                image_bytes = image_file.read()
                filename = getattr(image_file, 'filename', None)
            elif isinstance(image_file, bytes):
                image_bytes = image_file
            else:
                raise ValueError("Invalid image_file parameter")
            image_source = "upload"
        elif image_url:
            resp = requests.get(image_url, timeout=10)
            resp.raise_for_status()
            image_bytes = resp.content
            filename = image_url.split('/')[-1]
            image_source = "url"
        else:
            raise ValueError("Either image_file or image_url must be provided")

        # Open image and extract EXIF
        try:
            img = Image.open(BytesIO(image_bytes))
            exif_data = {}
            if hasattr(img, '_getexif') and img._getexif():
                raw_exif = img._getexif()
                for tag, value in raw_exif.items():
                    decoded = ExifTags.TAGS.get(tag, tag)
                    exif_data[decoded] = value
            else:
                exif_data = {"info": "No EXIF data found"}
            # Convert all EXIF data to JSON-serializable types
            exif_data = make_json_serializable(exif_data)
        except Exception as e:
            logger.error(f"Error reading image or EXIF: {e}")
            raise ValueError("Could not read image or extract EXIF data")

        # Encode image as base64 for frontend display
        try:
            img = Image.open(BytesIO(image_bytes))
            buffered = BytesIO()
            img.save(buffered, format=img.format or 'JPEG')
            img_b64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
            img_data_url = f"data:image/{img.format.lower()};base64,{img_b64}"
        except Exception as e:
            logger.error(f"Error encoding image to base64: {e}")
            img_data_url = None

        card = ModuleResultBuilder.build_card(
            title="Image EXIF Data",
            data=exif_data,
            subtitle=filename or image_source,
            show_properties=True,
            image=img_data_url
        )
        return ModuleResultBuilder.build_result(
            [card],
            display="single_card",
            title="Image EXIF Data",
            subtitle=f"EXIF metadata for {filename or image_source}"
        ) 