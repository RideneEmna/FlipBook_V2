import os
import pypdfium2 as pdfium
from PIL import Image
import wave
import struct
import math
import random

def convert_pdf_to_webp():
    pdf_path = os.path.join("livre", "Best English Unit 1.pdf")
    output_dir = os.path.join("public", "pages")
    thumbs_dir = os.path.join(output_dir, "thumbs")
    audio_dir = os.path.join("public", "audio")
    
    os.makedirs(output_dir, exist_ok=True)
    os.makedirs(thumbs_dir, exist_ok=True)
    os.makedirs(audio_dir, exist_ok=True)
    
    print(f"Loading PDF from {pdf_path}...")
    pdf = pdfium.PdfDocument(pdf_path)
    total_pages = len(pdf)
    print(f"Total pages: {total_pages}")
    
    # 300 DPI scale: 300 / 72 ≈ 4.166667
    dpi_300_scale = 300 / 72
    # 72 DPI scale for thumbnails
    dpi_thumb_scale = 72 / 72

    for i in range(total_pages):
        page_num = i + 1
        page_filename = f"page-{page_num:03d}.webp"
        page_path = os.path.join(output_dir, page_filename)
        thumb_path = os.path.join(thumbs_dir, page_filename)
        
        page = pdf[i]
        
        # Render high-res 300 DPI
        if not os.path.exists(page_path):
            pil_image = page.render(scale=dpi_300_scale).to_pil()
            pil_image.save(page_path, "WEBP", quality=85, method=4)
        
        # Render thumbnail
        if not os.path.exists(thumb_path):
            thumb_image = page.render(scale=dpi_thumb_scale).to_pil()
            # Resize slightly to standard thumbnail width (e.g. 240px)
            w, h = thumb_image.size
            target_w = 240
            target_h = int(h * (target_w / w))
            thumb_resized = thumb_image.resize((target_w, target_h), Image.Resampling.LANCZOS)
            thumb_resized.save(thumb_path, "WEBP", quality=80)
            
        print(f"Processed page {page_num}/{total_pages} -> {page_filename}")

    print("All pages converted to 300 DPI WebP successfully!")
    
    # Generate or copy page flip sound effect (paper swish)
    import shutil
    audio_wav_path = os.path.join(audio_dir, "page-flip.wav")
    source_audio = r"D:\2026-2027\CONVERTISSEUR PDF FLIP BOOK\ressources\page-flip.wav"
    if os.path.exists(source_audio):
        shutil.copy2(source_audio, audio_wav_path)
        print("Copied external page-flip.wav successfully!")
    else:
        create_page_flip_audio(audio_wav_path)

def create_page_flip_audio(filepath):
    """Generates a realistic gentle paper flip sound wave file."""
    sample_rate = 44100
    duration = 0.35  # seconds
    n_samples = int(sample_rate * duration)
    
    with wave.open(filepath, "w") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        
        frames = []
        for i in range(n_samples):
            t = i / sample_rate
            # Envelope: fast attack, quick decay
            envelope = math.exp(-12.0 * t) * (1.0 - math.exp(-60.0 * t))
            # Filtered noise simulating paper rubbing
            noise = (random.random() * 2.0 - 1.0)
            # Add subtle woosh tone
            freq = 280.0 * (1.0 - 0.5 * t)
            woosh = math.sin(2.0 * math.pi * freq * t) * 0.3
            sample_val = (noise * 0.7 + woosh) * envelope
            # Clamp to 16-bit
            int_val = int(max(-1.0, min(1.0, sample_val)) * 32767 * 0.8)
            frames.append(struct.pack("<h", int_val))
            
        wav_file.writeframes(b"".join(frames))
    print(f"Generated page-flip sound effect at {filepath}")

if __name__ == "__main__":
    convert_pdf_to_webp()
