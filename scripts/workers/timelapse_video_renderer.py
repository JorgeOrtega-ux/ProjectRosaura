import os
import sys
import time
import json
import subprocess
from PIL import Image
import io

# Colors cache for hex to RGB tuple
_HEX_CACHE = {}

def hex_to_rgb(hex_str):
    if not hex_str or hex_str == 'transparent':
        return (255, 255, 255)
    cached = _HEX_CACHE.get(hex_str)
    if cached:
        return cached
    h = hex_str.lstrip('#')
    if len(h) == 3:
        h = ''.join([c*2 for c in h])
    if len(h) >= 6:
        try:
            r = int(h[0:2], 16)
            g = int(h[2:4], 16)
            b = int(h[4:6], 16)
            rgb = (r, g, b)
            _HEX_CACHE[hex_str] = rgb
            return rgb
        except ValueError:
            pass
    return (0, 0, 0)

def render_timelapse_to_mp4(jsonl_path, output_mp4_path, duration_seconds=15, target_max_dim=1080, fps=30, end_freeze_sec=2.0):
    """
    Renders a JSONL timelapse events file into an MP4 video using Pillow and FFmpeg,
    with full support for dynamic canvas expansions, resizes, and resets.
    """
    if not os.path.exists(jsonl_path):
        raise FileNotFoundError(f"Timelapse file not found: {jsonl_path}")

    # Read events
    events = []
    with open(jsonl_path, 'r', encoding='utf-8') as f:
        for line in f:
            l = line.strip()
            if not l:
                continue
            try:
                events.append(json.loads(l))
            except Exception:
                continue

    if not events:
        raise ValueError("No valid timelapse events found in file.")

    # 1. Scan for final canvas dimensions and initial canvas dimensions
    init_w = 64
    init_h = 64
    final_w = 64
    final_h = 64

    for ev in events:
        etype = ev.get('type')
        if etype in ('init', 'resize', 'reset'):
            nw = int(ev.get('w', final_w))
            nh = int(ev.get('h', final_h))
            if nw > 0 and nh > 0:
                final_w = nw
                final_h = nh

    # Find initial size from the first init/reset event
    for ev in events:
        if ev.get('type') in ('init', 'reset') and ev.get('w') and ev.get('h'):
            init_w = int(ev['w'])
            init_h = int(ev['h'])
            break

    # 2. Calculate output video dimensions based on final canvas aspect ratio
    max_side = max(final_w, final_h)
    scale = max(1, target_max_dim // max_side)
    out_w = final_w * scale
    out_h = final_h * scale

    # Ensure even dimensions for H.264 yuv420p encoding
    if out_w % 2 != 0:
        out_w += 1
    if out_h % 2 != 0:
        out_h += 1

    video_aspect = out_w / out_h

    # Total frames to generate
    active_frames = int(duration_seconds * fps)
    freeze_frames = int(end_freeze_sec * fps)
    total_events = len(events)

    # Initialize canvas buffer with initial dimensions
    canvas_w = init_w
    canvas_h = init_h
    board = bytearray([255, 255, 255] * (canvas_w * canvas_h))

    def compute_target_camera(cw, ch):
        c_aspect = cw / ch
        if c_aspect < video_aspect:
            # Canvas is narrower/taller than video (center horizontally)
            th = float(ch)
            tw = th * video_aspect
            tx = -(tw - cw) / 2.0
            ty = 0.0
        else:
            # Canvas is wider than video (center vertically)
            tw = float(cw)
            th = tw / video_aspect
            tx = 0.0
            ty = -(th - ch) / 2.0
        return tx, ty, tw, th

    cam_x, cam_y, cam_w, cam_h = compute_target_camera(canvas_w, canvas_h)
    target_cam_x, target_cam_y, target_cam_w, target_cam_h = cam_x, cam_y, cam_w, cam_h

    # Helper to apply events
    def apply_event(evt):
        nonlocal canvas_w, canvas_h, board, target_cam_x, target_cam_y, target_cam_w, target_cam_h
        etype = evt.get('type') or ('pixel' if 'x' in evt else None)
        
        if etype == 'pixel':
            x = int(evt.get('x', 0))
            y = int(evt.get('y', 0))
            if 0 <= x < canvas_w and 0 <= y < canvas_h:
                rgb = hex_to_rgb(evt.get('c'))
                idx = (y * canvas_w + x) * 3
                board[idx] = rgb[0]
                board[idx+1] = rgb[1]
                board[idx+2] = rgb[2]
                
        elif etype == 'clear':
            x1 = max(0, min(canvas_w - 1, int(evt.get('x1', 0))))
            y1 = max(0, min(canvas_h - 1, int(evt.get('y1', 0))))
            x2 = max(0, min(canvas_w - 1, int(evt.get('x2', canvas_w - 1))))
            y2 = max(0, min(canvas_h - 1, int(evt.get('y2', canvas_h - 1))))
            min_x, max_x = min(x1, x2), max(x1, x2)
            min_y, max_y = min(y1, y2), max(y1, y2)
            row_len = (max_x - min_x + 1) * 3
            white_row = b'\xff' * row_len
            for cy in range(min_y, max_y + 1):
                row_start = (cy * canvas_w + min_x) * 3
                board[row_start:row_start + row_len] = white_row
                
        elif etype == 'resize':
            nw = int(evt.get('w', canvas_w))
            nh = int(evt.get('h', canvas_h))
            if nw > 0 and nh > 0 and (nw != canvas_w or nh != canvas_h):
                new_board = bytearray([255, 255, 255] * (nw * nh * 3))
                copy_w = min(canvas_w, nw)
                copy_h = min(canvas_h, nh)
                for cy in range(copy_h):
                    old_start = cy * canvas_w * 3
                    old_end = old_start + (copy_w * 3)
                    new_start = cy * nw * 3
                    new_end = new_start + (copy_w * 3)
                    new_board[new_start:new_end] = board[old_start:old_end]
                board = new_board
                canvas_w = nw
                canvas_h = nh
                target_cam_x, target_cam_y, target_cam_w, target_cam_h = compute_target_camera(canvas_w, canvas_h)
                
        elif etype == 'init' or etype == 'reset':
            nw = int(evt.get('w', canvas_w))
            nh = int(evt.get('h', canvas_h))
            if nw > 0 and nh > 0:
                canvas_w = nw
                canvas_h = nh
                board = bytearray([255, 255, 255] * (canvas_w * canvas_h))
                target_cam_x, target_cam_y, target_cam_w, target_cam_h = compute_target_camera(canvas_w, canvas_h)

    os.makedirs(os.path.dirname(os.path.abspath(output_mp4_path)), exist_ok=True)

    # Launch FFmpeg process
    ffmpeg_cmd = [
        "ffmpeg", "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{out_w}x{out_h}",
        "-pix_fmt", "rgb24",
        "-r", str(fps),
        "-i", "-",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "faster",
        "-crf", "20",
        "-movflags", "+faststart",
        output_mp4_path
    ]

    proc = subprocess.Popen(ffmpeg_cmd, stdin=subprocess.PIPE, stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)

    current_event_idx = 0
    last_frame_bytes = None
    zoom_smoothing = 0.15

    try:
        for f_idx in range(active_frames):
            target_event_idx = min(total_events, int(((f_idx + 1) / active_frames) * total_events))
            
            while current_event_idx < target_event_idx:
                apply_event(events[current_event_idx])
                current_event_idx += 1

            # Smoothly interpolate camera towards target camera
            cam_x += (target_cam_x - cam_x) * zoom_smoothing
            cam_y += (target_cam_y - cam_y) * zoom_smoothing
            cam_w += (target_cam_w - cam_w) * zoom_smoothing
            cam_h += (target_cam_h - cam_h) * zoom_smoothing

            # Convert board buffer to Pillow Image
            current_img = Image.frombytes('RGB', (canvas_w, canvas_h), bytes(board))
            
            # Map canvas coordinates to video viewport
            w_screen = max(1, int(round((canvas_w / cam_w) * out_w)))
            h_screen = max(1, int(round((canvas_h / cam_h) * out_h)))
            x_screen_0 = int(round((-cam_x / cam_w) * out_w))
            y_screen_0 = int(round((-cam_y / cam_h) * out_h))

            scaled_canvas = current_img.resize((w_screen, h_screen), Image.NEAREST)

            frame_img = Image.new('RGB', (out_w, out_h), (255, 255, 255))
            frame_img.paste(scaled_canvas, (x_screen_0, y_screen_0))

            frame_bytes = frame_img.tobytes()
            last_frame_bytes = frame_bytes
            proc.stdin.write(frame_bytes)

        # Freeze last frame for end_freeze_sec
        if last_frame_bytes and freeze_frames > 0:
            for _ in range(freeze_frames):
                proc.stdin.write(last_frame_bytes)

        proc.stdin.close()
        proc.wait()

    except Exception as err:
        if proc.poll() is None:
            proc.kill()
        raise err

    if not os.path.exists(output_mp4_path) or os.path.getsize(output_mp4_path) == 0:
        raise RuntimeError("FFmpeg failed to produce valid MP4 video.")

    return {
        "output_path": output_mp4_path,
        "width": out_w,
        "height": out_h,
        "duration": duration_seconds + end_freeze_sec,
        "size_bytes": os.path.getsize(output_mp4_path)
    }

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python timelapse_video_renderer.py <input.jsonl> <output.mp4> [duration_sec]")
        sys.exit(1)
    in_file = sys.argv[1]
    out_file = sys.argv[2]
    dur = float(sys.argv[3]) if len(sys.argv) > 3 else 15
    res = render_timelapse_to_mp4(in_file, out_file, duration_seconds=dur)
    print(f"[+] Render complete: {res}")
