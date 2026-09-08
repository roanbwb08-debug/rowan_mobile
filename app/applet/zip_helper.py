import os
import zipfile

def zipdir(path, ziph):
    for root, dirs, files in os.walk(path):
        # Exclude build-cache and generated directories from recursion
        dirs[:] = [d for d in dirs if d not in ['.dart_tool', 'build', '.gradle', '.symlinks', '.idea']]
        for file in files:
            file_path = os.path.join(root, file)
            # Keep relative path with rowan_mobile/ prefix
            rel_path = os.path.relpath(file_path, os.path.dirname(path) if os.path.dirname(path) else '.')
            ziph.write(file_path, rel_path)

archive_name = 'rowan_mobile_actual_implementation.zip'
print(f"Creating archive {archive_name}...")

with zipfile.ZipFile(archive_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
    zipdir('rowan_mobile', zipf)

size_bytes = os.path.getsize(archive_name)
size_mb = size_bytes / (1024 * 1024)
print(f"Archive created successfully!")
print(f"Size: {size_bytes} bytes ({size_mb:.2f} MB)")
