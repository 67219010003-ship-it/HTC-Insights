import os
import zipfile
import datetime

def create_backup():
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    backup_filename = f"htc_insights_backup_{timestamp}.zip"
    backup_filepath = os.path.join(root_dir, backup_filename)

    ignored_dirs = {
        "node_modules", ".next", ".git", ".superpowers",
        "__pycache__", ".pytest_cache", "venv", ".venv", "env"
    }
    ignored_extensions = {".pyc", ".pyo", ".pyd", ".zip", ".tmp", ".log"}
    ignored_files = {".DS_Store", "Thumbs.db"}

    file_count = 0
    total_uncompressed_bytes = 0

    print(f"Creating backup archive: {backup_filename}...")
    with zipfile.ZipFile(backup_filepath, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as zip_file:
        for root, dirs, files in os.walk(root_dir):
            # Prune ignored directories in-place so os.walk does not traverse them
            dirs[:] = [d for d in dirs if d not in ignored_dirs and not d.startswith(".")]

            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in ignored_extensions or file in ignored_files:
                    continue
                if file.startswith("htc_insights_backup_"):
                    continue

                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, root_dir)

                try:
                    zip_file.write(full_path, arcname=rel_path)
                    file_count += 1
                    total_uncompressed_bytes += os.path.getsize(full_path)
                except Exception as e:
                    print(f"Warning: Could not add {rel_path}: {e}")

    compressed_bytes = os.path.getsize(backup_filepath)
    compressed_mb = compressed_bytes / (1024 * 1024)
    uncompressed_mb = total_uncompressed_bytes / (1024 * 1024)

    print(f"\n[Backup Complete!]")
    print(f"File: {backup_filepath}")
    print(f"Files bundled: {file_count:,} files")
    print(f"Uncompressed size: {uncompressed_mb:.2f} MB")
    print(f"Compressed ZIP size: {compressed_mb:.2f} MB")
    return backup_filepath

if __name__ == "__main__":
    create_backup()
