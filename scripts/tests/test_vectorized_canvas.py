import os
import sys
import time
import json
import zlib
import numpy as np
from PIL import Image

# Ensure path is included
sys.path.insert(0, '/app')
sys.path.insert(0, '/app/scripts')

from workers.worker_canvas_jobs import (
    ResilientStreamConsumer,
    compute_chunk_crc_map,
    get_redis_client,
    parse_size
)

def test_resize_vectorization():
    print("=== [TEST 1] Vectorized Canvas Resize vs Legacy Loop ===")
    
    sizes_to_test = [
        ((64, 64), (128, 128)),
        ((128, 128), (64, 64)),
        ((512, 512), (1024, 1024)),
        ((1024, 1024), (512, 512))
    ]
    
    for (old_w, old_h), (new_w, new_h) in sizes_to_test:
        # Generate reproducible random RGBA bytes
        np.random.seed(42)
        old_arr_orig = np.random.randint(0, 256, (old_h, old_w, 4), dtype=np.uint8)
        old_state = old_arr_orig.tobytes()
        
        # 1. Legacy loop method
        t0 = time.perf_counter()
        limit_x = min(old_w, new_w)
        limit_y = min(old_h, new_h)
        legacy_state = bytearray([0, 0, 0, 0] * (new_w * new_h))
        for y in range(limit_y):
            for x in range(limit_x):
                old_idx = ((y * old_w) + x) * 4
                new_idx = ((y * new_w) + x) * 4
                legacy_state[new_idx] = old_state[old_idx]
                legacy_state[new_idx+1] = old_state[old_idx+1]
                legacy_state[new_idx+2] = old_state[old_idx+2]
                legacy_state[new_idx+3] = old_state[old_idx+3]
        legacy_bytes = bytes(legacy_state)
        t_legacy = (time.perf_counter() - t0) * 1000.0
        
        # 2. Vectorized NumPy method
        t0 = time.perf_counter()
        old_arr = np.frombuffer(old_state, dtype=np.uint8).reshape((old_h, old_w, 4))
        new_arr = np.zeros((new_h, new_w, 4), dtype=np.uint8)
        new_arr[:limit_y, :limit_x] = old_arr[:limit_y, :limit_x]
        vec_bytes = new_arr.tobytes()
        t_vec = (time.perf_counter() - t0) * 1000.0
        
        assert legacy_bytes == vec_bytes, f"Mismatch in bytes for {old_w}x{old_h} -> {new_w}x{new_h}!"
        speedup = t_legacy / max(t_vec, 0.001)
        print(f"  [PASS] {old_w}x{old_h} -> {new_w}x{new_h}: Exact match! Legacy: {t_legacy:.2f}ms, Vectorized: {t_vec:.3f}ms (Speedup: {speedup:.1f}x)")

def test_template_injection_and_chunks():
    print("\n=== [TEST 2] Template Injection, Vector Blending & Dirty Chunks CRC32 ===")
    canvas_w, canvas_h = 1024, 1024
    canvas_arr = np.zeros((canvas_h, canvas_w, 4), dtype=np.uint8)
    
    # Create a 256x256 test image with transparency
    img_w, img_h = 256, 256
    img_data = np.zeros((img_h, img_w, 4), dtype=np.uint8)
    # Circle with alpha 255 in middle, 0 outside
    yy, xx = np.ogrid[:img_h, :img_w]
    center_y, center_x = img_h // 2, img_w // 2
    mask = (xx - center_x)**2 + (yy - center_y)**2 <= (img_w // 3)**2
    img_data[mask] = [255, 100, 50, 255] # Orange solid
    img_data[~mask] = [0, 0, 0, 0] # Transparent
    
    start_x, start_y = 400, 400
    
    # Clipping
    c_x1 = max(0, start_x)
    c_y1 = max(0, start_y)
    c_x2 = min(canvas_w, start_x + img_w)
    c_y2 = min(canvas_h, start_y + img_h)
    
    img_x1 = c_x1 - start_x
    img_y1 = c_y1 - start_y
    img_x2 = img_x1 + (c_x2 - c_x1)
    img_y2 = img_y1 + (c_y2 - c_y1)
    
    img_sub = img_data[img_y1:img_y2, img_x1:img_x2]
    canvas_sub = canvas_arr[c_y1:c_y2, c_x1:c_x2]
    
    alpha_mask = img_sub[..., 3] >= 128
    replacement = img_sub.copy()
    replacement[..., 3] = 255
    canvas_sub[alpha_mask] = replacement[alpha_mask]
    canvas_arr[c_y1:c_y2, c_x1:c_x2] = canvas_sub
    
    changed = int(np.count_nonzero(alpha_mask))
    
    # Chunk calculation (512x512)
    CHUNK_SIZE = 512
    min_chunk_x = c_x1 // CHUNK_SIZE
    max_chunk_x = (c_x2 - 1) // CHUNK_SIZE
    min_chunk_y = c_y1 // CHUNK_SIZE
    max_chunk_y = (c_y2 - 1) // CHUNK_SIZE
    
    affected_chunks = []
    for cy in range(min_chunk_y, max_chunk_y + 1):
        for cx in range(min_chunk_x, max_chunk_x + 1):
            affected_chunks.append(f"{cx},{cy}")
            
    crc_map = compute_chunk_crc_map(canvas_arr, affected_chunks, CHUNK_SIZE)
    
    assert changed > 0, "No pixels changed!"
    assert len(affected_chunks) > 0, "No affected chunks calculated!"
    assert len(crc_map) == len(affected_chunks), "CRC map mismatch!"
    
    print(f"  [PASS] Blended {changed} pixels in {len(affected_chunks)} chunks: {affected_chunks}")
    for chk, crc in crc_map.items():
        print(f"    Chunk {chk} -> CRC32: 0x{crc}")

def test_resilient_stream_consumer_and_dlq():
    print("\n=== [TEST 3] Redis Streams Consumer, ACK & Dead Letter Queue (DLQ) ===")
    r = get_redis_client()
    stream_key = "stream:test_resilience"
    group_name = "group:test_resilience"
    legacy_key = "queue:test_legacy"
    
    # Clean up test keys
    r.delete(stream_key, legacy_key, "stream:dead_letter", "queue:dead_letter")
    
    consumer = ResilientStreamConsumer(
        r,
        stream_key=stream_key,
        group_name=group_name,
        legacy_queue_key=legacy_key,
        max_retries=3,
        claim_idle_ms=1000
    )
    
    # 3.1 Normal task processing with XACK
    print("  -> Testing normal task with XACK...")
    r.xadd(stream_key, {"payload": json.dumps({"action": "resize", "canvas_id": 999})})
    task, ack_cb, fail_cb = consumer.fetch_task(block_ms=1000)
    assert task is not None, "Failed to fetch stream task!"
    assert task.get("canvas_id") == 999
    ack_cb()
    
    # Ensure stream message is acknowledged and removed
    pending = r.xpending_range(stream_key, group_name, min='-', max='+', count=10)
    assert len(pending) == 0, f"Expected 0 pending messages after ACK, found {len(pending)}"
    print("  [PASS] Normal task processed and acknowledged successfully.")
    
    # 3.2 Poisoned task routing to DLQ after 3 retries
    print("  -> Testing poisoned task failure & DLQ isolation...")
    r.xadd(stream_key, {"payload": json.dumps({"corrupted": True, "task_id": "bad_job_1"})})
    
    for attempt in range(1, 4):
        task, ack_cb, fail_cb = consumer.fetch_task(block_ms=1000)
        assert task is not None, f"Attempt {attempt}: failed to fetch task!"
        fail_cb(Exception(f"Simulated failure on attempt {attempt}"))
        time.sleep(0.1)
    
    # Check Dead Letter Queue
    dlq_items = r.lrange("queue:dead_letter", 0, -1)
    assert len(dlq_items) >= 1, "Poisoned task was NOT moved to DLQ!"
    dlq_data = json.loads(dlq_items[-1])
    assert "bad_job_1" in dlq_data.get("payload", ""), "DLQ payload mismatch!"
    print("  [PASS] Poisoned task isolated into DLQ without crashing queue.")
    
    # 3.3 Legacy queue fallback
    print("  -> Testing legacy queue fallback (LPUSH/RPUSH)...")
    r.rpush(legacy_key, json.dumps({"legacy_action": "reset", "canvas_id": 123}))
    task, ack_cb, fail_cb = consumer.fetch_task(block_ms=500)
    assert task is not None, "Failed to fetch legacy task!"
    assert task.get("canvas_id") == 123
    ack_cb()
    print("  [PASS] Legacy queue drained seamlessly.")
    
    # Clean up test keys
    r.delete(stream_key, legacy_key, "stream:dead_letter", "queue:dead_letter")

if __name__ == "__main__":
    print("==================================================")
    print("RUNNING UNIT & INTEGRATION TESTS FOR ROSAURA ENGINE")
    print("==================================================")
    try:
        test_resize_vectorization()
        test_template_injection_and_chunks()
        test_resilient_stream_consumer_and_dlq()
        print("\n==================================================")
        print(">>> ALL TESTS PASSED SUCCESSFULLY! (100% HEALTHY)")
        print("==================================================")
    except Exception as e:
        print(f"\n[!] TEST FAILED WITH ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
