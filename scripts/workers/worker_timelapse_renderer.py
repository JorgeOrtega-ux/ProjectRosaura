import os
import sys
import time
import json
import subprocess
from PIL import Image

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

def kill_process_safely(proc):
    """Rescue helper: unconditionally terminate and kill subprocess to prevent zombies."""
    if proc is None:
        return
    try:
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=2)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait(timeout=2)
    except Exception:
        try:
            proc.kill()
        except Exception:
            pass

def render_timelapse_to_mp4(jsonl_path, output_mp4_path, duration_seconds=15, target_max_dim=1920, fps=30, end_freeze_sec=2.0, max_timeout_sec=120):
    """
    Renders a snapshot's JSONL event stream into an MP4 video with watchdog timeout and CPU rescue systems.
    """
    start_time = time.time()
    if not os.path.exists(jsonl_path):
        raise FileNotFoundError(f"Timelapse file not found: {jsonl_path}")

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

    init_w = 64
    init_h = 64
    final_w = 64
    final_h = 64
    has_resizes = False

    for ev in events:
        etype = ev.get('type')
        if etype in ('init', 'resize', 'reset'):
            nw = int(ev.get('w', final_w))
            nh = int(ev.get('h', final_h))
            if nw > 0 and nh > 0:
                if (nw != final_w or nh != final_h) and final_w != 64:
                    has_resizes = True
                final_w = nw
                final_h = nh

    for ev in events:
        if ev.get('type') in ('init', 'reset') and ev.get('w') and ev.get('h'):
            init_w = int(ev['w'])
            init_h = int(ev['h'])
            break

    if init_w != final_w or init_h != final_h:
        has_resizes = True

    max_side = max(final_w, final_h)
    if target_max_dim >= max_side:
        scale = max(1, round(target_max_dim / max_side))
        out_w = final_w * scale
        out_h = final_h * scale
    else:
        scale_float = target_max_dim / max_side
        out_w = max(2, int(round(final_w * scale_float)))
        out_h = max(2, int(round(final_h * scale_float)))

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
            th = float(ch)
            tw = th * video_aspect
            tx = -(tw - cw) / 2.0
            ty = 0.0
        else:
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

    # Launch FFmpeg process with CPU thread capping and fast preset
    ffmpeg_cmd = [
        "ffmpeg", "-y",
        "-threads", "2",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{out_w}x{out_h}",
        "-pix_fmt", "rgb24",
        "-r", str(fps),
        "-i", "-",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "veryfast",
        "-crf", "22",
        "-movflags", "+faststart",
        output_mp4_path
    ]

    proc = subprocess.Popen(
        ffmpeg_cmd,
        stdin=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        bufsize=10485760
    )

    current_event_idx = 0
    last_frame_bytes = None
    zoom_smoothing = 0.15
    deadline = start_time + max_timeout_sec

    try:
        for f_idx in range(active_frames):
            if time.time() > deadline:
                raise TimeoutError(f"Timelapse video rendering exceeded timeout limit ({max_timeout_sec}s).")

            target_event_idx = min(total_events, int(((f_idx + 1) / active_frames) * total_events))
            
            while current_event_idx < target_event_idx:
                apply_event(events[current_event_idx])
                current_event_idx += 1

            if not has_resizes and canvas_w == out_w and canvas_h == out_h:
                frame_bytes = bytes(board)
            elif not has_resizes:
                src_img = Image.frombuffer('RGB', (canvas_w, canvas_h), board, 'raw', 'RGB', 0, 1)
                resized_img = src_img.resize((out_w, out_h), Image.NEAREST)
                frame_bytes = resized_img.tobytes()
            else:
                cam_x += (target_cam_x - cam_x) * zoom_smoothing
                cam_y += (target_cam_y - cam_y) * zoom_smoothing
                cam_w += (target_cam_w - cam_w) * zoom_smoothing
                cam_h += (target_cam_h - cam_h) * zoom_smoothing

                current_img = Image.frombuffer('RGB', (canvas_w, canvas_h), board, 'raw', 'RGB', 0, 1)
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

        if last_frame_bytes and freeze_frames > 0:
            for _ in range(freeze_frames):
                if time.time() > deadline:
                    raise TimeoutError("Timeout exceeded during end freeze frames.")
                proc.stdin.write(last_frame_bytes)

        proc.stdin.close()
        try:
            proc.wait(timeout=15)
        except subprocess.TimeoutExpired:
            kill_process_safely(proc)
            raise TimeoutError("FFmpeg encoding wait timed out.")

    except Exception as err:
        kill_process_safely(proc)
        if os.path.exists(output_mp4_path):
            try:
                os.remove(output_mp4_path)
            except Exception:
                pass
        raise err
    finally:
        kill_process_safely(proc)

    if not os.path.exists(output_mp4_path) or os.path.getsize(output_mp4_path) == 0:
        raise RuntimeError("FFmpeg failed to produce valid MP4 video.")

    elapsed = round(time.time() - start_time, 2)
    return {
        "output_path": output_mp4_path,
        "width": out_w,
        "height": out_h,
        "duration": duration_seconds + end_freeze_sec,
        "size_bytes": os.path.getsize(output_mp4_path),
        "elapsed_seconds": elapsed
    }

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python worker_timelapse_renderer.py <input.jsonl> <output.mp4> [duration_sec] [target_max_dim]")
        sys.exit(1)
    in_file = sys.argv[1]
    out_file = sys.argv[2]
    dur = float(sys.argv[3]) if len(sys.argv) > 3 else 15
    max_dim = int(sys.argv[4]) if len(sys.argv) > 4 else 1920
    res = render_timelapse_to_mp4(in_file, out_file, duration_seconds=dur, target_max_dim=max_dim)
    print(f"[+] Render complete: {res}")
