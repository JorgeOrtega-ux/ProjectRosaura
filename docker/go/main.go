package main

import (
	"bytes"
	"compress/gzip"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

var rdb *redis.Client
var ctx = context.Background()

func initRedis() {
	redisPass := os.Getenv("REDIS_PASS")
	redisHost := os.Getenv("REDIS_HOST")
	if redisHost == "" {
		redisHost = "redis:6379"
	}
	if !strings.Contains(redisHost, ":") {
		redisHost += ":6379"
	}
	rdb = redis.NewClient(&redis.Options{
		Addr:     redisHost,
		Password: redisPass,
		DB:       0,
	})
	
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("Error connecting to Redis: %v", err)
	}
	log.Println("Connected to Redis")
}

type ChunkRequest struct {
	CanvasID int      `json:"canvas_id"`
	BoardW   int      `json:"board_w"`
	BoardH   int      `json:"board_h"`
	Chunks   []string `json:"chunks"`
}

type ChunkResponse struct {
	Success bool `json:"success"`
	Data    struct {
		CanvasID  int               `json:"canvas_id"`
		ChunkSize int               `json:"chunk_size"`
		Chunks    map[string]string `json:"chunks"`
	} `json:"data"`
}

func getChunksHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ChunkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.CanvasID <= 0 || req.BoardW <= 0 || req.BoardH <= 0 || len(req.Chunks) == 0 {
		http.Error(w, "Invalid parameters", http.StatusBadRequest)
		return
	}

	chunkSize := 512
	redisKey := fmt.Sprintf("canvas:%d:state", req.CanvasID)

	response := ChunkResponse{Success: true}
	response.Data.CanvasID = req.CanvasID
	response.Data.ChunkSize = chunkSize
	response.Data.Chunks = make(map[string]string)

	exists, _ := rdb.Exists(ctx, redisKey).Result()
	if exists == 0 {
		expectedLen := req.BoardW * req.BoardH * 4
		rdb.Set(ctx, redisKey, make([]byte, expectedLen), 0)
	}

	totalSize := req.BoardW * req.BoardH * 4
	useFullFetch := totalSize <= 16*1024*1024 || len(req.Chunks) >= 2

	chunkBuffers := make(map[string][]byte)
	t0 := time.Now()

	if useFullFetch {
		canvasBytes, err := rdb.Get(ctx, redisKey).Bytes()
		if err != nil && err != redis.Nil {
			http.Error(w, "Redis error", http.StatusInternalServerError)
			return
		}
		if err == redis.Nil || len(canvasBytes) == 0 {
			canvasBytes = make([]byte, totalSize)
			rdb.Set(ctx, redisKey, canvasBytes, 0)
		}
		if len(canvasBytes) < totalSize {
			padded := make([]byte, totalSize)
			copy(padded, canvasBytes)
			canvasBytes = padded
		}

		for _, chunkKey := range req.Chunks {
			parts := strings.Split(chunkKey, ",")
			if len(parts) != 2 {
				continue
			}
			cx, err1 := strconv.Atoi(parts[0])
			cy, err2 := strconv.Atoi(parts[1])
			if err1 != nil || err2 != nil {
				continue
			}

			startX := cx * chunkSize
			startY := cy * chunkSize

			if startX >= req.BoardW || startY >= req.BoardH || startX < 0 || startY < 0 {
				continue
			}

			actualW := min(chunkSize, req.BoardW-startX)
			actualH := min(chunkSize, req.BoardH-startY)

			buf := make([]byte, actualW*actualH*4)
			destOffset := 0
			rowLen := actualW * 4

			for y := 0; y < actualH; y++ {
				srcOffset := ((startY+y)*req.BoardW + startX) * 4
				copy(buf[destOffset:destOffset+rowLen], canvasBytes[srcOffset:srcOffset+rowLen])
				destOffset += rowLen
			}
			chunkBuffers[chunkKey] = buf
		}
		log.Printf("In-memory fetch & extraction took %v", time.Since(t0))
	} else {
		// Fallback to Redis pipeline if the canvas is huge and only 1 chunk is requested
		pipe := rdb.Pipeline()

		type RowFetch struct {
			ChunkKey string
			Y        int
			Cmd      *redis.StringCmd
		}

		var fetches []RowFetch

		for _, chunkKey := range req.Chunks {
			parts := strings.Split(chunkKey, ",")
			if len(parts) != 2 {
				continue
			}
			cx, err1 := strconv.Atoi(parts[0])
			cy, err2 := strconv.Atoi(parts[1])
			if err1 != nil || err2 != nil {
				continue
			}

			startX := cx * chunkSize
			startY := cy * chunkSize

			if startX >= req.BoardW || startY >= req.BoardH || startX < 0 || startY < 0 {
				continue
			}

			actualW := min(chunkSize, req.BoardW-startX)
			actualH := min(chunkSize, req.BoardH-startY)
			rowLen := int64(actualW * 4)

			for y := 0; y < actualH; y++ {
				offset := int64(((startY+y)*req.BoardW + startX) * 4)
				cmd := pipe.GetRange(ctx, redisKey, offset, offset+rowLen-1)
				fetches = append(fetches, RowFetch{
					ChunkKey: chunkKey,
					Y:        y,
					Cmd:      cmd,
				})
			}
		}

		if len(fetches) == 0 {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(response)
			return
		}

		// Execute pipeline
		_, err := pipe.Exec(ctx)
		if err != nil && err != redis.Nil {
			http.Error(w, "Redis error", http.StatusInternalServerError)
			return
		}
		log.Printf("Redis pipeline took %v", time.Since(t0))

		// Group rows by chunk
		for _, f := range fetches {
			val, _ := f.Cmd.Bytes()
			expectedLen := int(min(chunkSize, req.BoardW-(func() int { cx, _ := strconv.Atoi(strings.Split(f.ChunkKey, ",")[0]); return cx * chunkSize })()) * 4)
			if len(val) < expectedLen {
				padded := make([]byte, expectedLen)
				copy(padded, val)
				val = padded
			}
			chunkBuffers[f.ChunkKey] = append(chunkBuffers[f.ChunkKey], val...)
		}
	}

	// Concurrently compress and base64 encode
	var wg sync.WaitGroup
	var mu sync.Mutex

	for key, buffer := range chunkBuffers {
		wg.Add(1)
		go func(k string, buf []byte) {
			defer wg.Done()

			var b bytes.Buffer
			gw, _ := gzip.NewWriterLevel(&b, gzip.BestSpeed)
			gw.Write(buf)
			gw.Close()

			encoded := base64.StdEncoding.EncodeToString(b.Bytes())

			mu.Lock()
			response.Data.Chunks[k] = encoded
			mu.Unlock()
		}(key, buffer)
	}

	wg.Wait()
	t2 := time.Now()
	log.Printf("Compression took %v", t2.Sub(t0)) // using t0 to match total operation timing reference

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
	t3 := time.Now()
	log.Printf("JSON encode took %v", t3.Sub(t2))
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func main() {
	initRedis()
	http.HandleFunc("/api/go/canvases/get_chunks", getChunksHandler)
	port := "8080"
	log.Printf("Go service listening on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
