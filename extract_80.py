import os
import subprocess
import shutil

def extract_frames():
    video_path = "videos/rotate.MP4"
    output_dir = "public/frames/rotate"
    target_count = 80
    
    # Clean existing
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
    os.makedirs(output_dir)

    # Get duration
    cmd_probe = [
        "ffprobe", "-v", "error", "-show_entries", "format=duration", 
        "-of", "default=noprint_wrappers=1:nokey=1", video_path
    ]
    duration = float(subprocess.check_output(cmd_probe).strip())
    
    # Calculate fps needed for 80 frames
    fps = target_count / duration
    
    print(f"Extracting {target_count} frames from {video_path} (Duration: {duration}s, FPS: {fps})...")

    cmd = [
        "ffmpeg",
        "-i", video_path,
        "-vf", f"scale=1920:-1,fps={fps}",
        "-c:v", "libwebp",
        "-q:v", "80",
        f"{output_dir}/rotate-%04d.webp"
    ]
    
    subprocess.run(cmd, check=True)
    
    # Cleanup to exact count if ffmpeg generated slightly more
    files = sorted([f for f in os.listdir(output_dir) if f.endswith('.webp')])
    print(f"Generated {len(files)} frames.")
    
    # Renaming to be sure
    for i, filename in enumerate(files):
        new_name = f"rotate-{str(i+1).zfill(4)}.webp"
        if filename != new_name:
            os.rename(os.path.join(output_dir, filename), os.path.join(output_dir, new_name))

    print("Done.")

if __name__ == "__main__":
    extract_frames()

