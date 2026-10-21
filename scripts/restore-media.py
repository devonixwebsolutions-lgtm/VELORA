"""Materialize licensed stock media once, then retain it in the repository."""
import concurrent.futures
import hashlib
import json
import pathlib
import re
import subprocess
import tempfile
import time
import urllib.request
import urllib.parse

ROOT = pathlib.Path(__file__).resolve().parents[1]
MEDIA = ROOT / 'public/media/velora'
manifest_file = MEDIA / 'manifest.json'
manifest = json.loads(manifest_file.read_text())

def download(url, destination):
    if destination.is_file() and destination.stat().st_size:
        return
    parsed = urllib.parse.urlparse(url)
    assert parsed.scheme == 'https' and parsed.hostname in ['images.unsplash.com','videos.pexels.com']
    last = None
    for attempt in range(3):
        try:
            request = urllib.request.Request(url, headers={'User-Agent':'VELORA-Static-Publisher/1.0'})
            with urllib.request.urlopen(request, timeout=180) as response, destination.open('wb') as output:
                if response.headers.get('content-type', '').startswith('text/html'):
                    raise ValueError('The stock provider returned an HTML page')
                while chunk := response.read(1024 * 1024):
                    output.write(chunk)
            return
        except Exception as error:
            last = error
            destination.unlink(missing_ok=True)
            time.sleep(attempt + 1)
    raise last

def inspect(file):
    data = json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(file)]))
    return next(item for item in data['streams'] if item['codec_type']=='video'), data

def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()

def restore_photo(photo):
    file = MEDIA / photo['file']
    assert file.parent == MEDIA
    download(photo['sourceUrl'], file)
    preview = MEDIA / pathlib.Path(photo['previewPath']).name
    download(photo['previewSourceUrl'], preview)
    track, _ = inspect(file)
    if track['width'] < 3840:
        raise ValueError(f'Photo is below 4K width: {file.name}')
    photo.update(width=track['width'], height=track['height'], bytes=file.stat().st_size, sha256=digest(file))
    photo.update(previewBytes=preview.stat().st_size, previewSha256=digest(preview))
    print('Ready:', file.name, flush=True)

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(restore_photo, manifest['photos']))

for film in manifest['videos']:
    desktop = MEDIA / film['file']
    mobile = MEDIA / pathlib.Path(film['mobilePath']).name
    poster = MEDIA / pathlib.Path(film['poster']).name
    if not all(file.exists() for file in [desktop, mobile, poster]):
        with tempfile.TemporaryDirectory() as temporary:
            source = pathlib.Path(temporary) / 'source.mp4'
            download(film['sourceUrl'], source)
            original, _ = inspect(source)
            if original['width'] < 3840 or original['height'] < 2160:
                raise ValueError('The provider source is not native 4K')
            match = re.search(r'beginning at (\d+(?:\.\d+)?) seconds', film.get('note',''))
            start = match.group(1) if match else '0'
            for file, size, maximum in [(desktop,'3840:2160','16M'),(mobile,'1920:1080','6M')]:
                subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',start,'-i',str(source),'-t','10','-an','-vf',f'scale={size}:flags=lanczos','-r','25','-c:v','libx264','-preset','veryfast','-crf','20','-maxrate',maximum,'-bufsize',maximum,'-pix_fmt','yuv420p','-g','12','-keyint_min','12','-sc_threshold','0','-movflags','+faststart',str(file)],check=True)
            timestamp = str(film.get('posterTimestampInSource', float(start)+1))
            subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-ss',timestamp,'-i',str(source),'-frames:v','1','-q:v','2',str(poster)],check=True)
    for name, file, resolution in [('desktop',desktop,(3840,2160)),('mobile',mobile,(1920,1080))]:
        track, data = inspect(file)
        assert (track['width'],track['height']) == resolution
        assert track['codec_name']=='h264' and track['pix_fmt']=='yuv420p'
        assert not any(item['codec_type']=='audio' for item in data['streams'])
        assert file.stat().st_size < 24*1024*1024
        film['variants'][name].update(bytes=file.stat().st_size,sha256=digest(file))
    film.update(bytes=desktop.stat().st_size,sha256=digest(desktop),mobileBytes=mobile.stat().st_size,mobileSha256=digest(mobile),posterBytes=poster.stat().st_size,posterSha256=digest(poster))
    print('Ready:', desktop.name, flush=True)

manifest['totalBytes'] = sum(file.stat().st_size for file in MEDIA.iterdir() if file.is_file() and file!=manifest_file)
manifest_file.write_text(json.dumps(manifest, indent=2)+'\n')
